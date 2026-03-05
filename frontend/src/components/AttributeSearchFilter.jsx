import { useMemo, useState } from 'react'

function normalizeAttributeDefinitions(definitions) {
  return definitions.map((definition) => ({
    ...definition,
    aliases:
      Array.isArray(definition.aliases) && definition.aliases.length > 0
        ? definition.aliases.map((alias) => alias.toLowerCase())
        : [definition.key.toLowerCase()],
  }))
}

export function AttributeSearchFilter({
  definitions,
  activeFilters,
  onChange,
  placeholder = 'Filtrar... ex.: nome:matemática',
}) {
  const [inputValue, setInputValue] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)

  const normalizedDefinitions = useMemo(
    () => normalizeAttributeDefinitions(definitions),
    [definitions],
  )

  const draftAttribute = useMemo(() => {
    const [rawAttribute = ''] = inputValue.split(':')
    const token = rawAttribute.trim().toLowerCase()

    if (!token) {
      return null
    }

    return (
      normalizedDefinitions.find(
        (definition) =>
          definition.key.toLowerCase() === token || definition.aliases?.includes(token),
      ) ?? null
    )
  }, [inputValue, normalizedDefinitions])

  function getTheme(attribute) {
    const definition = normalizedDefinitions.find((item) => item.key === attribute)
    return definition?.theme || null
  }

  function getThemeClass(attribute) {
    const theme = getTheme(attribute)
    return theme ? `attribute-theme-${theme}` : ''
  }

  function getTagClass(attribute) {
    const theme = getTheme(attribute)
    return theme ? `subject-filter-tag subject-filter-tag-${theme}` : 'subject-filter-tag'
  }

  function handleAttributeShortcut(attributeKey) {
    const definition = normalizedDefinitions.find((item) => item.key === attributeKey)
    if (!definition) {
      return
    }

    setInputValue(`${definition.aliases?.[0] || definition.key}:`)
  }

  function parseInputToFilter(rawInput) {
    const [rawAttribute = '', ...valueParts] = rawInput.split(':')
    const attributeToken = rawAttribute.trim().toLowerCase()
    const rawValue = valueParts.join(':').trim()

    if (!attributeToken || !rawValue) {
      return null
    }

    const definition = normalizedDefinitions.find(
      (item) => item.key.toLowerCase() === attributeToken || item.aliases?.includes(attributeToken),
    )

    if (!definition) {
      return null
    }

    let value = rawValue
    let displayValue = rawValue

    if (definition.type === 'select') {
      const matchedOption = definition.options?.find(
        (option) =>
          option.value === rawValue || option.label.toLowerCase() === rawValue.toLowerCase(),
      )

      if (!matchedOption) {
        return null
      }

      value = matchedOption.value
      displayValue = matchedOption.label
    }

    return {
      id: `${definition.key}-${Date.now()}-${value}`,
      attribute: definition.key,
      label: definition.label,
      value,
      displayValue,
    }
  }

  function addFilter(rawInput = inputValue, options = {}) {
    const { keepAttributeInInput = false } = options
    const parsedFilter = parseInputToFilter(rawInput)

    if (!parsedFilter) {
      return
    }

    const exists = activeFilters.some(
      (filter) =>
        filter.attribute === parsedFilter.attribute &&
        filter.value.toLowerCase() === parsedFilter.value.toLowerCase(),
    )

    if (!exists) {
      onChange([...activeFilters, parsedFilter])
    }

    if (keepAttributeInInput) {
      const definition = normalizedDefinitions.find((item) => item.key === parsedFilter.attribute)
      setInputValue(`${definition?.aliases?.[0] || parsedFilter.attribute}:`)
      return
    }

    setInputValue('')
  }

  function removeFilter(filterId) {
    onChange(activeFilters.filter((filter) => filter.id !== filterId))
  }

  function clearFilters() {
    onChange([])
    setInputValue('')
  }

  const suggestions = useMemo(() => {
    const token = inputValue.trim().toLowerCase()

    if (!token || !token.includes(':')) {
      return normalizedDefinitions
        .filter((definition) =>
          !token
            ? true
            : definition.label.toLowerCase().includes(token) ||
              definition.aliases?.some((alias) => alias.includes(token)),
        )
        .map((definition) => ({
          id: definition.key,
          attribute: definition.key,
          label: definition.label,
          hint: `${definition.aliases?.[0] || definition.key}:valor`,
          onSelect: () => handleAttributeShortcut(definition.key),
        }))
    }

    if (!draftAttribute || draftAttribute.type !== 'select') {
      return []
    }

    const [, valuePart = ''] = inputValue.split(':')
    const valueToken = valuePart.trim().toLowerCase()

    return (draftAttribute.options ?? [])
      .filter((option) => option.label.toLowerCase().includes(valueToken))
      .slice(0, 8)
      .map((option) => ({
        id: option.value,
        attribute: draftAttribute.key,
        label: option.label,
        hint: `${draftAttribute.aliases?.[0] || draftAttribute.key}:${option.label}`,
        onSelect: () =>
          addFilter(`${draftAttribute.aliases?.[0] || draftAttribute.key}:${option.value}`, {
            keepAttributeInInput: !!draftAttribute.keepAttributeInInput,
          }),
      }))
  }, [draftAttribute, inputValue, normalizedDefinitions])

  const inputThemeClass = useMemo(() => {
    const token = inputValue.trim().toLowerCase()
    if (!token) {
      return ''
    }

    const [attributeToken = ''] = token.split(':')
    const definition = normalizedDefinitions.find(
      (item) =>
        item.key.toLowerCase() === attributeToken ||
        item.aliases?.includes(attributeToken) ||
        item.aliases?.some((alias) => alias.startsWith(attributeToken)),
    )

    return definition ? getThemeClass(definition.key) : ''
  }, [inputValue, normalizedDefinitions])

  return (
    <section className="subject-filter-builder" aria-label="Filtro">
      <div className={`subject-query-input-shell ${inputThemeClass}`}>
        {activeFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={getTagClass(filter.attribute)}
            onClick={() => removeFilter(filter.id)}
            title="Remover filtro"
          >
            <span>
              {filter.label}: {filter.displayValue || filter.value}
            </span>
            <strong aria-hidden="true">x</strong>
          </button>
        ))}

        <input
          type="text"
          value={inputValue}
          className={`subject-query-input ${inputThemeClass}`}
          placeholder={placeholder}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => window.setTimeout(() => setIsInputFocused(false), 120)}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addFilter()
            }

            if (event.key === 'Backspace' && !inputValue && activeFilters.length > 0) {
              removeFilter(activeFilters[activeFilters.length - 1].id)
            }
          }}
        />

        {activeFilters.length > 0 && (
          <button type="button" className="ghost-chip" onClick={clearFilters}>
            Limpar
          </button>
        )}
      </div>

      {isInputFocused && suggestions.length > 0 && (
        <div className="subject-filter-suggestions" role="listbox" aria-label="Sugestões de filtros">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className={`subject-filter-suggestion ${getThemeClass(suggestion.attribute)}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={suggestion.onSelect}
            >
              <strong>{suggestion.label}</strong>
              <span>{suggestion.hint}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
