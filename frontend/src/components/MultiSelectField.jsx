import { useEffect, useId, useMemo, useRef, useState } from 'react'

function normalizeValues(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item))
    .filter((item, index, list) => item && list.indexOf(item) === index)
}

export function MultiSelectField({
  options = [],
  value = [],
  onChange,
  placeholder = 'Selecione uma ou mais opcoes',
  searchPlaceholder = 'Filtrar opcoes...',
  disabled = false,
  noOptionsText = 'Nenhuma opcao encontrada',
  selectAllLabel = 'Selecionar todos',
  deselectAllLabel = 'Remover todos',
  clearLabel = 'Limpar',
  maxChips = 3,
  className = '',
}) {
  const fieldId = useId()
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const normalizedOptions = useMemo(
    () =>
      options.map((option) => ({
        value: String(option.value),
        label: String(option.label ?? option.value),
      })),
    [options],
  )
  const selectedValues = useMemo(() => normalizeValues(value), [value])
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues])

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return normalizedOptions
    }

    return normalizedOptions.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
  }, [normalizedOptions, search])

  const selectedOptions = useMemo(
    () => normalizedOptions.filter((option) => selectedSet.has(option.value)),
    [normalizedOptions, selectedSet],
  )

  const allSelected = normalizedOptions.length > 0 && selectedValues.length === normalizedOptions.length

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleClickOutside(event) {
      if (containerRef.current?.contains(event.target)) {
        return
      }

      setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus()
      return
    }

    setSearch('')
  }, [isOpen])

  function emitChange(nextValues) {
    onChange?.(normalizeValues(nextValues))
  }

  function toggleValue(optionValue) {
    if (selectedSet.has(optionValue)) {
      emitChange(selectedValues.filter((item) => item !== optionValue))
      return
    }

    emitChange([...selectedValues, optionValue])
  }

  function toggleAll() {
    emitChange(allSelected ? [] : normalizedOptions.map((option) => option.value))
  }

  function clearSelection() {
    emitChange([])
  }

  function onTriggerKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen((current) => !current)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`multi-select-field ${isOpen ? 'is-open' : ''} ${className}`.trim()}
    >
      <button
        id={fieldId}
        type="button"
        className="multi-select-trigger"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        {selectedOptions.length === 0 && <span className="multi-select-placeholder">{placeholder}</span>}

        {selectedOptions.length > 0 && (
          <span className="multi-select-chip-list">
            {selectedOptions.slice(0, maxChips).map((option) => (
              <span key={option.value} className="multi-select-chip">
                {option.label}
              </span>
            ))}

            {selectedOptions.length > maxChips && (
              <span className="multi-select-chip multi-select-chip-counter">
                +{selectedOptions.length - maxChips}
              </span>
            )}
          </span>
        )}

        <span className="multi-select-caret" aria-hidden="true">
          {isOpen ? '▴' : '▾'}
        </span>
      </button>

      {isOpen && (
        <div className="multi-select-panel">
          <div className="multi-select-toolbar">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="multi-select-search"
            />
            <button type="button" className="multi-select-action" onClick={toggleAll}>
              {allSelected ? deselectAllLabel : selectAllLabel}
            </button>
            <button type="button" className="multi-select-action" onClick={clearSelection}>
              {clearLabel}
            </button>
          </div>

          <div className="multi-select-options" role="listbox" aria-multiselectable="true" aria-labelledby={fieldId}>
            {filteredOptions.length === 0 && <p className="multi-select-empty">{noOptionsText}</p>}

            {filteredOptions.map((option) => {
              const checked = selectedSet.has(option.value)

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`multi-select-option ${checked ? 'is-selected' : ''}`.trim()}
                  onClick={() => toggleValue(option.value)}
                >
                  <span className="multi-select-checkbox" aria-hidden="true">
                    {checked ? '✓' : ''}
                  </span>
                  <span className="multi-select-option-label">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
