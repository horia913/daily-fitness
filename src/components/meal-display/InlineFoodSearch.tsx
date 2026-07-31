"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { MealPlanService, type Food } from "@/lib/mealPlanService";
import { foodCatalogFormFromName } from "@/lib/mealPlans/foodCatalogForm";
import {
  readRecentFoodIds,
  recordRecentFoodId,
} from "@/lib/mealPlans/mealFoodRecentsStorage";
import { InlineCreateFoodForm } from "./InlineCreateFoodForm";
import styles from "./mealDisplay.module.css";

export interface InlineFoodSearchHandle {
  focusInput: () => void;
}

interface InlineFoodSearchProps {
  onSelect: (food: Food) => void;
  onCancel: () => void;
  /** Food ids already used in this plan (optional quick-pick group). */
  planFoodIds?: string[];
}

function FoodResultButton({
  food,
  onSelect,
}: {
  food: Food;
  onSelect: (food: Food) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={styles.foodSearchItem}
        onClick={() => onSelect(food)}
      >
        <span className={styles.foodSearchName}>{food.name}</span>
        <span className={styles.foodSearchMeta}>
          {Math.round(food.calories_per_serving)} cal · {food.serving_size}
          {food.serving_unit}
        </span>
      </button>
    </li>
  );
}

export const InlineFoodSearch = forwardRef<InlineFoodSearchHandle, InlineFoodSearchProps>(
  function InlineFoodSearch({ onSelect, onCancel, planFoodIds = [] }, ref) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Food[]>([]);
    const [recents, setRecents] = useState<Food[]>([]);
    const [planFoods, setPlanFoods] = useState<Food[]>([]);
    const [searching, setSearching] = useState(false);
    const [loadingQuickPick, setLoadingQuickPick] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusInput: () => inputRef.current?.focus(),
    }));

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const q = query.trim();
      if (q.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      debounceRef.current = setTimeout(() => {
        void MealPlanService.searchFoods(q)
          .then((foods) => setResults(foods))
          .catch(() => setResults([]))
          .finally(() => setSearching(false));
      }, 280);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [query]);

    useEffect(() => {
      if (query.trim().length >= 2) return;
      let cancelled = false;
      setLoadingQuickPick(true);
      const recentIds = readRecentFoodIds();
      const planIds = [...new Set(planFoodIds)].filter(
        (id) => !recentIds.includes(id),
      );
      void Promise.all([
        recentIds.length ? MealPlanService.getFoodsByIds(recentIds) : Promise.resolve([]),
        planIds.length ? MealPlanService.getFoodsByIds(planIds) : Promise.resolve([]),
      ])
        .then(([recentFoods, inPlanFoods]) => {
          if (cancelled) return;
          setRecents(recentFoods);
          setPlanFoods(inPlanFoods);
        })
        .catch(() => {
          if (!cancelled) {
            setRecents([]);
            setPlanFoods([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingQuickPick(false);
        });
      return () => {
        cancelled = true;
      };
    }, [query, planFoodIds]);

    const handleSelect = (food: Food) => {
      recordRecentFoodId(food.id);
      onSelect(food);
    };

    const trimmedQuery = query.trim();
    const showSearchResults = trimmedQuery.length >= 2;
    const showQuickPick = !showSearchResults && !showCreateForm;
    const createLabel = trimmedQuery
      ? `＋ Create "${trimmedQuery}"`
      : "＋ Create custom food";

    if (showCreateForm) {
      return (
        <InlineCreateFoodForm
          initialForm={foodCatalogFormFromName(trimmedQuery)}
          onCreated={(food) => {
            recordRecentFoodId(food.id);
            onSelect(food);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      );
    }

    return (
      <div className={styles.foodSearch}>
        <input
          ref={inputRef}
          type="text"
          className={styles.inlineInput}
          placeholder="Search foods…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        {showSearchResults ? (
          <ul className={styles.foodSearchResults}>
            {searching ? (
              <li className={styles.foodSearchEmpty}>Searching…</li>
            ) : results.length === 0 ? (
              <li className={styles.foodSearchEmpty}>No foods found</li>
            ) : (
              results.map((food) => (
                <FoodResultButton key={food.id} food={food} onSelect={handleSelect} />
              ))
            )}
            <li className={styles.foodSearchFooter}>
              <button
                type="button"
                className={styles.foodSearchCreate}
                onClick={() => setShowCreateForm(true)}
              >
                {createLabel}
              </button>
            </li>
          </ul>
        ) : showQuickPick ? (
          <ul className={styles.foodSearchResults}>
            {loadingQuickPick ? (
              <li className={styles.foodSearchEmpty}>Loading…</li>
            ) : (
              <>
                {recents.length > 0 ? (
                  <>
                    <li className={styles.foodSearchGroupLabel}>Recent</li>
                    {recents.map((food) => (
                      <FoodResultButton key={food.id} food={food} onSelect={handleSelect} />
                    ))}
                  </>
                ) : null}
                {planFoods.length > 0 ? (
                  <>
                    <li className={styles.foodSearchGroupLabel}>In this plan</li>
                    {planFoods.map((food) => (
                      <FoodResultButton key={`plan-${food.id}`} food={food} onSelect={handleSelect} />
                    ))}
                  </>
                ) : null}
                {recents.length === 0 && planFoods.length === 0 && !loadingQuickPick ? (
                  <li className={styles.foodSearchEmpty}>Search or pick a recent food</li>
                ) : null}
              </>
            )}
            <li className={styles.foodSearchFooter}>
              <button
                type="button"
                className={styles.foodSearchCreate}
                onClick={() => setShowCreateForm(true)}
              >
                {createLabel}
              </button>
            </li>
          </ul>
        ) : null}
        <button type="button" className={styles.foodSearchCancel} onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  },
);
