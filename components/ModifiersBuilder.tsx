'use client'

import React, { useState } from 'react'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

export interface Modifier {
  id: string
  name: string
  options: ModifierOption[]
  required: boolean
  multipleSelect: boolean
}

export interface ModifierOption {
  id: string
  name: string
  priceAdjustment: number
}

interface ModifiersBuildProps {
  modifiers: Modifier[]
  onChange: (modifiers: Modifier[]) => void
  className?: string
}

const ModifiersBuilder: React.FC<ModifiersBuildProps> = ({
  modifiers,
  onChange,
  className = ''
}) => {
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null)
  const [showModifierModal, setShowModifierModal] = useState(false)
  const [modifierName, setModifierName] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [isMultipleSelect, setIsMultipleSelect] = useState(false)
  const [options, setOptions] = useState<ModifierOption[]>([])
  const [optionName, setOptionName] = useState('')
  const [optionPrice, setOptionPrice] = useState('')

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const handleAddModifier = () => {
    setEditingModifier(null)
    setModifierName('')
    setIsRequired(false)
    setIsMultipleSelect(false)
    setOptions([])
    setShowModifierModal(true)
  }

  const handleEditModifier = (modifier: Modifier) => {
    setEditingModifier(modifier)
    setModifierName(modifier.name)
    setIsRequired(modifier.required)
    setIsMultipleSelect(modifier.multipleSelect)
    setOptions([...modifier.options])
    setShowModifierModal(true)
  }

  const handleDeleteModifier = (modifierId: string) => {
    onChange(modifiers.filter(m => m.id !== modifierId))
  }

  const handleSaveModifier = () => {
    if (!modifierName || options.length === 0) {
      alert('Please provide a modifier name and at least one option')
      return
    }

    const modifier: Modifier = {
      id: editingModifier?.id || generateId(),
      name: modifierName,
      options,
      required: isRequired,
      multipleSelect: isMultipleSelect,
    }

    if (editingModifier) {
      onChange(modifiers.map(m => m.id === modifier.id ? modifier : m))
    } else {
      onChange([...modifiers, modifier])
    }

    setShowModifierModal(false)
  }

  const handleAddOption = () => {
    if (!optionName) return

    const newOption: ModifierOption = {
      id: generateId(),
      name: optionName,
      priceAdjustment: parseFloat(optionPrice) || 0,
    }

    setOptions([...options, newOption])
    setOptionName('')
    setOptionPrice('')
  }

  const handleDeleteOption = (optionId: string) => {
    setOptions(options.filter(o => o.id !== optionId))
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Modifiers (Sizes, Add-ons, etc.)
        </label>
        <button
          type="button"
          onClick={handleAddModifier}
          className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Add Modifier Group
        </button>
      </div>

      {/* Modifiers List */}
      {modifiers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-sm text-gray-500">No modifiers yet</p>
          <p className="text-xs text-gray-400 mt-1">Add sizes, add-ons, or customization options</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modifiers.map((modifier) => (
            <div
              key={modifier.id}
              className="p-4 bg-surface-alt rounded-xl border border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{modifier.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {modifier.required && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                    {modifier.multipleSelect && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Multiple
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditModifier(modifier)}
                    className="p-2 rounded-lg hover:bg-white transition-all"
                  >
                    <PencilIcon className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteModifier(modifier.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-all"
                  >
                    <TrashIcon className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="mt-3 space-y-1">
                {modifier.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">{option.name}</span>
                    <span className="font-mono text-gray-600">
                      {option.priceAdjustment >= 0 ? '+' : ''}€{option.priceAdjustment.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modifier Modal */}
      {showModifierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingModifier ? 'Edit Modifier Group' : 'Add Modifier Group'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Modifier Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={modifierName}
                  onChange={(e) => setModifierName(e.target.value)}
                  placeholder="e.g., Size, Milk Options, Extra Toppings"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Settings */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isMultipleSelect}
                    onChange={(e) => setIsMultipleSelect(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Allow multiple selection</span>
                </label>
              </div>

              {/* Add Option */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={optionName}
                    onChange={(e) => setOptionName(e.target.value)}
                    placeholder="Option name (e.g., Small, Large)"
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={optionPrice}
                    onChange={(e) => setOptionPrice(e.target.value)}
                    placeholder="Price ±"
                    className="w-24 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Options List */}
              {options.length > 0 && (
                <div className="space-y-2">
                  {options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{option.name}</span>
                        <span className="ml-3 font-mono text-sm text-gray-600">
                          {option.priceAdjustment >= 0 ? '+' : ''}€{option.priceAdjustment.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(option.id)}
                        className="p-1 rounded hover:bg-red-100 transition-all"
                      >
                        <TrashIcon className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModifierModal(false)}
                className="px-6 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModifier}
                className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-all"
              >
                {editingModifier ? 'Update' : 'Add'} Modifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModifiersBuilder
