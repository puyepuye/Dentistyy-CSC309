import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupBusiness } from '../lib/api.js';
import { isValidPassword, PASSWORD_HINT } from '../lib/passwordValidation.js';
import AuthFormSection from '../components/marketing/AuthFormSection.jsx';
import FormTextField from '../components/marketing/FormTextField.jsx';
import styles from '../styles/MarketingForms.module.css';

const DEFAULT_LOCATION = { lat: 43.6532, lon: -79.3832 };

function BusinessSignupPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        business_name: '',
        owner_name: '',
        email: '',
        phone_number: '',
        postal_address: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    function updateField(event) {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
    

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');
        
        if (formData.password !== passwordConfirm) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (!isValidPassword(formData.password)) {
            setError(`Password does not meet requirements. ${PASSWORD_HINT}`);
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                location: DEFAULT_LOCATION,
            };
            const result = await signupBusiness(payload);
            navigate('/activate', {
                replace: true,
                state: {
                    email: formData.email.trim(),
                    resetToken: result.resetToken,
                },
            });
        } catch (err) {
            const base = err.message || 'Request failed';
            if (base === 'Conflict') {
                setError('An account with this email already exists. Try logging in instead.');
            } else if (base === 'Invalid payload') {
            setError( `${base}. ${PASSWORD_HINT} Ensure phone and address are filled in.`);}
            else{
                setError(base)
            }
        } finally {
            setLoading(false);
        }
    }
    const created = Boolean(successMessage);


    return (
        <AuthFormSection
            title="Register your business"
            intro="Creates a business account on Dentistyy. Location is defaulted to downtown Toronto (you can refine coordinates later in the product)."
            footer={
                <p className={styles.formHint}>
                    Already registered? <Link to="/login">Login</Link> ·{' '}
                    <Link to="/directory">Businesses overview</Link>
                </p>
            }
        >
            <form className={styles.authForm} onSubmit={handleSubmit}>
                <FormTextField
                    label="Practice / business name"
                    name="business_name"
                    value={formData.business_name}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Owner name"
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Phone number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Business address"
                    name="postal_address"
                    value={formData.postal_address}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={updateField}
                    required
                    autoComplete="new=password"
                    maxLength={20}
                />
                <label>
                    Confirm password
                    <input
                        name="password_confirm"
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required
                        autoComplete="new-password"
                        disabled={created}
                        // minLength={8}
                        maxLength={20}
                    />
                </label>
                <p className={styles.formHint}>{PASSWORD_HINT}</p>
                {error && <p className={styles.error}>{error}</p>}
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading}>
                    {loading ? 'Creating practice…' : 'Create practice account'}
                </button>
            </form>
        </AuthFormSection>
    );
}

export default BusinessSignupPage;
