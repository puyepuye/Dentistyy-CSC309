import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupRegularUser } from '../lib/api.js';
import AuthFormSection from '../components/marketing/AuthFormSection.jsx';
import FormTextField from '../components/marketing/FormTextField.jsx';
import styles from '../styles/MarketingForms.module.css';

function SignupPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        postal_address: '',
        birthday: '',
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
            const result = await signupRegularUser(formData);
            setSuccessMessage(
                `Account created. Activation reset token: ${result.resetToken}. Use /auth/resets/:token to activate, then login.`
            );
            setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthFormSection
            title="Sign up as talent"
            intro="Create a professional account to browse and apply to shifts."
            footer={
                <p className={styles.formHint}>
                    Already registered? <Link to="/login">Login</Link> · Listing a practice?{' '}
                    <Link to="/signup/business">Business signup</Link>
                </p>
            }
        >
            <form className={styles.authForm} onSubmit={handleSubmit}>
                <FormTextField
                    label="First name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Last name"
                    name="last_name"
                    value={formData.last_name}
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
                />
                <FormTextField
                    label="Postal address"
                    name="postal_address"
                    value={formData.postal_address}
                    onChange={updateField}
                />
                <FormTextField
                    label="Birthday"
                    name="birthday"
                    type="date"
                    value={formData.birthday}
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
                    {loading ? 'Creating account...' : 'Create account'}
                </button>
            </form>
        </AuthFormSection>
    );
}

export default SignupPage;
