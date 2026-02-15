'use client';
import React, { useState, useEffect } from 'react';
import { getPool, getIncoming, getMatches, addToPool } from '@/lib/api';
import StatsBar from './StatsBar';
import MutualSection from './MutualSection';
import IncomingSection from './IncomingSection';
import OutgoingSection from './OutgoingSection';
import MatchPreviewModal from './MatchPreviewModal';

function Pool({ currentUser }) {
  const [mutualMatches, setMutualMatches] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  // Change loadAllData:
const loadAllData = async () => {
  try {
    const [matchesData, incomingData, outgoingData] = await Promise.all([
      getMatches(),     // No currentUser.id needed
      getIncoming(),    // No currentUser.id needed
      getPool()         // No currentUser.id needed
    ]);

    setMutualMatches(matchesData);
    setIncoming(incomingData);
    setOutgoing(outgoingData);
  } catch (error) {
    console.error('Failed to load data', error);
  } finally {
    setLoading(false);
  }
};

// Change handleAccept:
const handleAccept = async (profileId) => {
  try {
    await addToPool(profileId); // Just pass the ID
    await loadAllData();
  } catch (error) {
    console.error('Failed to accept');
  }
};

  const handlePass = (profileId) => {
    setIncoming(incoming.filter(p => p.id !== profileId));
  };

  const handleViewProfile = (profile) => {
    setSelectedMatch(profile);
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
  };

  const handleStartVideo = (match) => {
    setSelectedMatch(null);
    // Navigate to video chat would go here
    // For now, just alert
    alert(`Starting video chat with ${match.name}`);
  };

  if (loading) {
    return <div className="loading">Loading your connections...</div>;
  }

  const mutualIds = mutualMatches.map(m => m.id);

  return (
    <div className="pool-page">
      <div className="pool-header">
        <h2>Your Connections</h2>
      </div>

      <StatsBar
        mutualCount={mutualMatches.length}
        incomingCount={incoming.length}
        outgoingCount={outgoing.length}
      />

      <div className="pool-sections">
        <MutualSection
          matches={mutualMatches}
          onMatchClick={handleMatchClick}
        />

        <IncomingSection
          incoming={incoming}
          onAccept={handleAccept}
          onPass={handlePass}
          onViewProfile={handleViewProfile}
        />

        <OutgoingSection
          outgoing={outgoing}
          mutualIds={mutualIds}
        />
      </div>

      {selectedMatch && (
        <MatchPreviewModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onStartVideo={handleStartVideo}
        />
      )}
    </div>
  );
}

export default Pool;