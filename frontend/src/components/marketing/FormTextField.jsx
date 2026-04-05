/**
 * Label + controlled input for marketing auth forms (inherits .authForm label styles from parent).
 */
export default function FormTextField({
    label,
    name,
    type = 'text',
    value,
    onChange,
    required = false,
}) {
    return (
        <label>
            {label}
            <input name={name} type={type} value={value} onChange={onChange} required={required} />
        </label>
    );
}
