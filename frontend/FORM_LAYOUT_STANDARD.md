# Padrão de Layout de Formulários

Este padrão deve ser usado em todos os formulários de criação/edição.

## Regra-base

- Grid único de `12 colunas` no desktop.
- Até `2-3` campos por linha.
- Mobile/tablet (`<= 1080px`): `1 campo por linha`.
- Labels sempre acima do input.
- Campos de ação (`status`, botões, checklist, títulos de seção) ocupam linha inteira.

## Larguras recomendadas

- `form-span-3` ou `form-span-4`: campos curtos (`UF`, `CEP`, `CPF`, `CNPJ`, `Ano`, `Número`, `Tipo`).
- `form-span-6`: campos médios (`Telefone`, `Senha`, `Perfil`, `Módulo`, datas, selects comuns).
- `form-span-8`: campos longos (`Nome`, `E-mail`, `Cidade`, `Rua`, `Título`).
- `form-span-12`: campos extensos (`Descrição`, `Observações`, multiselect, arquivo quando precisa destaque).

## Como usar no `CrudModule`

Cada item de `fields` pode declarar `span`:

```jsx
fields={[
  { name: 'name', label: 'Nome', span: 8 },
  { name: 'type', label: 'Tipo', type: 'select', span: 4 },
  { name: 'description', label: 'Descrição', type: 'textarea', span: 12 },
]}
```

Sem `span`, o `CrudModule` usa inferência automática por tipo/nome do campo.

## Como usar em formulários manuais

```jsx
<form className="stack-form">
  <label className="form-span-8">...</label>
  <label className="form-span-4">...</label>
</form>
```

## Checklist de UX antes de publicar

- Campos curtos realmente estão ao lado de outros campos curtos.
- Não há mais de 3 campos por linha.
- Fluxo visual segue a ordem lógica de preenchimento.
- Formulário continua legível em mobile.
