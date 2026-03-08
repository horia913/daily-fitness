'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Info, Clock, Target, Zap } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles?.() ?? {};

  return (
    <>
      {/* Basic Information */}
      <Card
        className={`${theme?.card ?? ''} fc-glass fc-card border ${theme?.border ?? ''} rounded-2xl`}
      >
        <CardHeader className="px-3 py-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg`}
            >
              <Info className={`w-4 h-4 text-white`} />
            </div>
            <CardTitle className={`text-lg font-bold ${theme?.text ?? ''}`}>
              Template Details
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6 space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className={`text-sm font-medium ${theme?.text ?? ''}`}
            >
              Template Name *
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
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className={`text-sm font-medium ${theme?.text ?? ''}`}
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
              placeholder="Brief description of this workout template..."
              rows={3}
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Category Selection */}
        <Card
          className={`${theme?.card ?? ''} border ${theme?.border ?? ''} rounded-xl`}
        >
          <CardHeader className="p-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`p-1 rounded-md bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-md`}
              >
                <Target className={`w-3 h-3 text-white`} />
              </div>
              <CardTitle
                className={`text-sm font-semibold ${theme?.text ?? ''}`}
              >
                Category
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0">
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
              <SelectTrigger className="rounded-xl">
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
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: cat.color || "#6B7280",
                          }}
                        />
                        {cat.name || "Category"}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm fc-text-dim">
                    No categories available. Create categories in the
                    Categories page.
                  </div>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Duration Selection */}
        <Card
          className={`${theme?.card ?? ''} border ${theme?.border ?? ''} rounded-xl`}
        >
          <CardHeader className="p-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`p-1 rounded-md bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-md`}
              >
                <Clock className={`w-3 h-3 text-white`} />
              </div>
              <CardTitle
                className={`text-sm font-semibold ${theme?.text ?? ''}`}
              >
                Duration
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <Select
              value={formData.estimated_duration.toString()}
              onValueChange={(value) =>
                setFormData((prev: BasicInfoSectionProps["formData"]) => ({
                  ...prev,
                  estimated_duration: parseInt(value, 10),
                }))
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Difficulty Level */}
        <Card
          className={`${theme?.card ?? ''} border ${theme?.border ?? ''} rounded-xl`}
        >
          <CardHeader className="p-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`p-1 rounded-md bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-md`}
              >
                <Zap className={`w-3 h-3 text-white`} />
              </div>
              <CardTitle
                className={`text-sm font-semibold ${theme?.text ?? ''}`}
              >
                Difficulty
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <Select
              value={formData.difficulty_level}
              onValueChange={(value) =>
                setFormData((prev: BasicInfoSectionProps["formData"]) => ({
                  ...prev,
                  difficulty_level: value,
                }))
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficultyLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      {level.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
