'use client';

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Target } from "lucide-react";

const difficultyLevels = [
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
  { value: "Athlete", label: "Athlete" },
];

const durationOptions = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 75, label: "1 hour 15 min" },
  { value: 90, label: "1 hour 30 min" },
];

interface BasicInfoSectionProps {
  formData: {
    name: string;
    description: string;
    category: string;
    categoryId: string;
    estimated_duration: number;
    difficulty_level: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  categories: Array<{ id: string; name: string; color?: string }>;
}

export function BasicInfoSection({ formData, setFormData, categories }: BasicInfoSectionProps) {
  return (
    <>
      <div className="space-y-3">
        <div>
          <Label
            htmlFor="name"
            className="text-xs font-medium uppercase tracking-wide text-gray-400"
          >
            Template name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev: BasicInfoSectionProps["formData"]) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            placeholder="e.g., Upper Body Strength"
            required
            className="mt-1 h-9 text-sm rounded-lg"
          />
        </div>

        <div>
          <Label
            htmlFor="description"
            className="text-xs font-medium uppercase tracking-wide text-gray-400"
          >
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev: BasicInfoSectionProps["formData"]) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Brief description..."
            rows={3}
            className="mt-1 text-sm rounded-lg resize-none min-h-[4.5rem]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-black/5 dark:border-white/5 mt-4 pt-4">
        <div>
          <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Category
          </Label>
          <Select
            value={formData.categoryId}
            onValueChange={(categoryId) => {
              const selectedCategory = categories.find(
                (c) => c.id === categoryId,
              );
              setFormData((prev: BasicInfoSectionProps["formData"]) => ({
                ...prev,
                categoryId: categoryId,
                category: selectedCategory?.name || "general",
              }));
            }}
          >
            <SelectTrigger className="mt-1 h-9 text-sm rounded-lg">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: cat.color || "#6B7280",
                        }}
                      />
                      {cat.name || "Category"}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs fc-text-dim">
                  No categories. Create them in Categories.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Duration
          </Label>
          <Select
            value={formData.estimated_duration.toString()}
            onValueChange={(value) =>
              setFormData((prev: BasicInfoSectionProps["formData"]) => ({
                ...prev,
                estimated_duration: parseInt(value, 10),
              }))
            }
          >
            <SelectTrigger className="mt-1 h-9 text-sm rounded-lg">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value.toString()}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Difficulty
          </Label>
          <Select
            value={formData.difficulty_level}
            onValueChange={(value) =>
              setFormData((prev: BasicInfoSectionProps["formData"]) => ({
                ...prev,
                difficulty_level: value,
              }))
            }
          >
            <SelectTrigger className="mt-1 h-9 text-sm rounded-lg">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {difficultyLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-3.5 h-3.5" />
                    {level.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
