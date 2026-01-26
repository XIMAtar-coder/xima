import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ConsentCheckboxesProps {
  privacyAccepted: boolean;
  termsAccepted: boolean;
  onPrivacyChange: (checked: boolean) => void;
  onTermsChange: (checked: boolean) => void;
  showError?: boolean;
  className?: string;
}

export const ConsentCheckboxes: React.FC<ConsentCheckboxesProps> = ({
  privacyAccepted,
  termsAccepted,
  onPrivacyChange,
  onTermsChange,
  showError = false,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Privacy Policy Checkbox */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="consent-privacy"
          checked={privacyAccepted}
          onCheckedChange={(checked) => onPrivacyChange(checked === true)}
          className={`mt-0.5 ${showError && !privacyAccepted ? 'border-destructive' : ''}`}
          aria-describedby="consent-privacy-label"
        />
        <Label
          htmlFor="consent-privacy"
          id="consent-privacy-label"
          className="text-sm leading-relaxed cursor-pointer text-muted-foreground"
        >
          {t('register.acceptPrivacy', 'I agree to the')}{' '}
          <Link
            to="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3A9FFF] hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {t('legal.privacyPolicy', 'Privacy Policy')}
          </Link>
        </Label>
      </div>

      {/* Terms of Service Checkbox */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="consent-terms"
          checked={termsAccepted}
          onCheckedChange={(checked) => onTermsChange(checked === true)}
          className={`mt-0.5 ${showError && !termsAccepted ? 'border-destructive' : ''}`}
          aria-describedby="consent-terms-label"
        />
        <Label
          htmlFor="consent-terms"
          id="consent-terms-label"
          className="text-sm leading-relaxed cursor-pointer text-muted-foreground"
        >
          {t('register.acceptTerms', 'I agree to the')}{' '}
          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3A9FFF] hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {t('legal.termsOfService', 'Terms of Service')}
          </Link>
        </Label>
      </div>

      {/* Validation Error Message */}
      {showError && (!privacyAccepted || !termsAccepted) && (
        <p className="text-sm text-destructive mt-2" role="alert">
          {t('register.consentRequired', 'You must accept both the Privacy Policy and Terms of Service to continue.')}
        </p>
      )}
    </div>
  );
};

export default ConsentCheckboxes;
