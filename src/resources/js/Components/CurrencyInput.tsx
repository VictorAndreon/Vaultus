import { NumericFormat } from 'react-number-format'

interface Props {
  value: string | number
  onValueChange: (floatValue: number) => void
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  min?: number
}

export default function CurrencyInput({ value, onValueChange, className, style, placeholder, required, autoFocus, min }: Props) {
  return (
    <NumericFormat
      value={value === '' || value === 0 && String(value) === '0' ? '' : value}
      onValueChange={vals => onValueChange(vals.floatValue ?? 0)}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      prefix="R$ "
      allowNegative={false}
      placeholder={placeholder ?? 'R$ 0,00'}
      className={className}
      style={style}
      required={required}
      autoFocus={autoFocus}
      isAllowed={vals => min === undefined || (vals.floatValue ?? 0) >= min || vals.value === ''}
    />
  )
}
