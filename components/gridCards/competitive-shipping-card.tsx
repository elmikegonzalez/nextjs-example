'use client';

import React from 'react';
import { MarketingProgram } from '@/lib/types';
import { usePersonalize } from '../context/PersonalizeContext';
import { InfoCard, InfoCardLink, InfoCardTitle } from '../info-card';

interface CompetitiveShippingCardProps {
    competitiveShipping: MarketingProgram
}

const CompetitiveShippingCard = ({ competitiveShipping }: CompetitiveShippingCardProps) => {
    // Get the SDK and initialization state from context
    const { sdk, isInitialized } = usePersonalize();

    const onClickLearnMore = async (e: any) => {
        e.preventDefault();

        // Only trigger event if SDK is initialized
        if (isInitialized && sdk) {
            try {
                await sdk.triggerEvent('competitveShippinglearnMoreClick');
                console.log('Competitive shipping click event tracked successfully');
            } catch (error) {
                console.error('Error tracking competitive shipping click:', error);
            }
        } else {
            console.log('SDK not initialized, competitive shipping click not tracked');
        }
    }

    return (
        <InfoCard className={'rounded-lg text-white bg-gray-700'}>
            <InfoCardTitle>{competitiveShipping.heading}</InfoCardTitle>
            <InfoCardLink href={competitiveShipping.cta.href} onClick={onClickLearnMore}>
                {competitiveShipping.cta.title}
            </InfoCardLink>
        </InfoCard>
    );
}

export default CompetitiveShippingCard;