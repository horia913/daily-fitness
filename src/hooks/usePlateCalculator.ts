'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  PlateCalculator, 
  GymConfiguration, 
  PlateCalculationResult 
} from '@/lib/plateCalculator'

interface PlateCalculatorPreferences {
  defaultUnit: 'kg' | 'lb'
  defaultBarType: 'olympic' | 'standard' | 'ez' | 'hex'
  defaultGymConfig: string
  showVisualization: boolean
  showProgressions: boolean
  autoCalculate: boolean
}

interface PlateCalculatorHistory {
  calculations: Array<{
    weight: number
    unit: 'kg' | 'lb'
    barType: string
    timestamp: string
    plates: any[]
  }>
  favoriteWeights: number[]
  recentWeights: number[]
}

export function usePlateCalculator(userId: string) {
  const [preferences, setPreferences] = useState<PlateCalculatorPreferences>({
    defaultUnit: 'kg',
    defaultBarType: 'olympic',
    defaultGymConfig: 'Olympic Gym (KG)',
    showVisualization: true,
    showProgressions: true,
    autoCalculate: true
  })

  const [history, setHistory] = useState<PlateCalculatorHistory>({
    calculations: [],
    favoriteWeights: [],
    recentWeights: []
  })

  const [currentConfig, setCurrentConfig] = useState<GymConfiguration>(
    PlateCalculator.getStandardConfigurations()[0]
  )

  // Load user preferences and history
  useEffect(() => {
    loadUserData()
  }, [userId])

  const loadUserData = useCallback(async () => {
    try {
      // Load preferences
      const savedPreferences = localStorage.getItem(`plate_calculator_preferences_${userId}`)
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences))
      }

      // Load history
      const savedHistory = localStorage.getItem(`plate_calculator_history_${userId}`)
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory))
      }

      // Load gym configuration
      const savedConfig = localStorage.getItem(`plate_calculator_config_${userId}`)
      if (savedConfig) {
        setCurrentConfig(JSON.parse(savedConfig))
      } else {
        // Set default config based on preferences
        const configs = PlateCalculator.getStandardConfigurations()
        const defaultConfig = configs.find(c => c.name === preferences.defaultGymConfig) || configs[0]
        setCurrentConfig(defaultConfig)
      }
    } catch (error) {
      console.error('Error loading plate calculator data:', error)
    }
  }, [userId, preferences.defaultGymConfig])

  const savePreferences = useCallback(async (newPreferences: Partial<PlateCalculatorPreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences }
    setPreferences(updatedPreferences)
    
    try {
      localStorage.setItem(`plate_calculator_preferences_${userId}`, JSON.stringify(updatedPreferences))
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }, [preferences, userId])

  const saveConfig = useCallback(async (config: GymConfiguration) => {
    setCurrentConfig(config)
    
    try {
      localStorage.setItem(`plate_calculator_config_${userId}`, JSON.stringify(config))
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }, [userId])

  const addCalculationToHistory = useCallback(async (
    weight: number,
    unit: 'kg' | 'lb',
    barType: string,
    plates: any[]
  ) => {
    const newCalculation = {
      weight,
      unit,
      barType,
      timestamp: new Date().toISOString(),
      plates
    }

    const newHistory = {
      ...history,
      calculations: [newCalculation, ...history.calculations].slice(0, 50), // Keep last 50
      recentWeights: [weight, ...history.recentWeights.filter(w => w !== weight)].slice(0, 10)
    }

    setHistory(newHistory)
    
    try {
      localStorage.setItem(`plate_calculator_history_${userId}`, JSON.stringify(newHistory))
    } catch (error) {
      console.error('Error saving history:', error)
    }
  }, [history, userId])

  const addToFavorites = useCallback(async (weight: number) => {
    const newFavorites = [...history.favoriteWeights]
    if (!newFavorites.includes(weight)) {
      newFavorites.push(weight)
      newFavorites.sort((a, b) => a - b)
    }

    const newHistory = { ...history, favoriteWeights: newFavorites }
    setHistory(newHistory)
    
    try {
      localStorage.setItem(`plate_calculator_history_${userId}`, JSON.stringify(newHistory))
    } catch (error) {
      console.error('Error saving favorites:', error)
    }
  }, [history, userId])

  const removeFromFavorites = useCallback(async (weight: number) => {
    const newFavorites = history.favoriteWeights.filter(w => w !== weight)
    const newHistory = { ...history, favoriteWeights: newFavorites }
    setHistory(newHistory)
    
    try {
      localStorage.setItem(`plate_calculator_history_${userId}`, JSON.stringify(newHistory))
    } catch (error) {
      console.error('Error saving favorites:', error)
    }
  }, [history, userId])

  const calculatePlates = useCallback((
    weight: number,
    barType?: 'olympic' | 'standard' | 'ez' | 'hex',
    unit?: 'kg' | 'lb'
  ): PlateCalculationResult => {
    const finalBarType = barType || preferences.defaultBarType
    const finalUnit = unit || preferences.defaultUnit
    
    const result = PlateCalculator.calculatePlates(weight, finalBarType, finalUnit, currentConfig.plates)
    
    // Add to history if auto-calculate is enabled
    if (preferences.autoCalculate && result.isValid) {
      addCalculationToHistory(weight, finalUnit, finalBarType, result.platesPerSide)
    }
    
    return result
  }, [preferences, currentConfig, addCalculationToHistory])

  const getWeightProgressions = useCallback((weight: number, unit?: 'kg' | 'lb') => {
    const finalUnit = unit || preferences.defaultUnit
    return PlateCalculator.getWeightProgressions(weight, finalUnit)
  }, [preferences])

  const convertWeight = useCallback((weight: number, fromUnit: 'kg' | 'lb', toUnit: 'kg' | 'lb') => {
    return PlateCalculator.convertWeight(weight, fromUnit, toUnit)
  }, [])

  const getStandardConfigurations = useCallback(() => {
    return PlateCalculator.getStandardConfigurations()
  }, [])

  const createCustomConfiguration = useCallback((
    name: string,
    plates: any[],
    barWeight: number,
    unit: 'kg' | 'lb',
    description?: string
  ) => {
    return PlateCalculator.createCustomConfiguration(name, plates, barWeight, unit, description)
  }, [])

  const validateConfiguration = useCallback((config: GymConfiguration) => {
    return PlateCalculator.validateConfiguration(config)
  }, [])

  const clearHistory = useCallback(() => {
    const clearedHistory: PlateCalculatorHistory = {
      calculations: [],
      favoriteWeights: history.favoriteWeights, // Keep favorites
      recentWeights: []
    }
    
    setHistory(clearedHistory)
    
    try {
      localStorage.setItem(`plate_calculator_history_${userId}`, JSON.stringify(clearedHistory))
    } catch (error) {
      console.error('Error clearing history:', error)
    }
  }, [history.favoriteWeights, userId])

  const exportData = useCallback(() => {
    return {
      preferences,
      history,
      currentConfig,
      exportDate: new Date().toISOString()
    }
  }, [preferences, history, currentConfig])

  const importData = useCallback((data: any) => {
    try {
      if (data.preferences) setPreferences(data.preferences)
      if (data.history) setHistory(data.history)
      if (data.currentConfig) setCurrentConfig(data.currentConfig)
      
      // Save to localStorage
      if (data.preferences) {
        localStorage.setItem(`plate_calculator_preferences_${userId}`, JSON.stringify(data.preferences))
      }
      if (data.history) {
        localStorage.setItem(`plate_calculator_history_${userId}`, JSON.stringify(data.history))
      }
      if (data.currentConfig) {
        localStorage.setItem(`plate_calculator_config_${userId}`, JSON.stringify(data.currentConfig))
      }
    } catch (error) {
      console.error('Error importing data:', error)
    }
  }, [userId])

  return {
    preferences,
    history,
    currentConfig,
    savePreferences,
    saveConfig,
    addCalculationToHistory,
    addToFavorites,
    removeFromFavorites,
    calculatePlates,
    getWeightProgressions,
    convertWeight,
    getStandardConfigurations,
    createCustomConfiguration,
    validateConfiguration,
    clearHistory,
    exportData,
    importData
  }
}
