import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupBusiness } from '../lib/api.js';
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

        try {
            const payload = {
                ...formData,
                location: DEFAULT_LOCATION,
            };
            const result = await signupBusiness(payload);
            setSuccessMessage(
                `Practice account created. Activation token: ${result.resetToken}. Complete activation via the API, then log in.`
            );
            setTimeout(() => navigate('/login'), 1600);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthFormSection
            title="Register your practice"
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
                />
                {error && <p className={styles.error}>{error}</p>}
                {successMessage && <p className={styles.success}>{successMessage}</p>}
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading}>
                    {loading ? 'Creating practice…' : 'Create practice account'}
                </button>
            </form>
        </AuthFormSection>
    );
}

export default BusinessSignupPage;
