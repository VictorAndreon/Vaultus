/**
 * Converte 'YYYY-MM-DD' num Date ao MEIO-DIA local, evitando o drift de fuso de
 * `new Date('YYYY-MM-DD')` (que é interpretado como meia-noite UTC e, em fusos
 * negativos, "volta" um dia). Retorna null se a string não for uma data válida —
 * para a UI degradar com um fallback em vez de exibir "NaN"/"Invalid Date".
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const d = new Date(`${value}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Formata uma data 'YYYY-MM-DD' via toLocaleDateString, com fallback seguro
 * quando a entrada é inválida (nunca renderiza "Invalid Date").
 */
export function formatLocalDate(
    value: string | null | undefined,
    options: Intl.DateTimeFormatOptions,
    locale = 'pt-BR',
    fallback = '—',
): string {
    const d = parseLocalDate(value)
    return d ? d.toLocaleDateString(locale, options) : fallback
}
