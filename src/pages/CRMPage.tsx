import React from 'react';
import { useLocation } from 'react-router-dom';
import CRMDashboard from '@/components/CRMDashboard';
import { useAuth } from '@/hooks/useAuth';

const CRMPage = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { repId, repName } = location.state || {};

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CRMDashboard 
        userId={repId || user.id} 
        role={profile.role}
        repName={repName}
      />
    </div>
  );
};

export default CRMPage;