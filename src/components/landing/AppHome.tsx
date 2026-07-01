import React from 'react';

import CreatorLanding from "./CreatorLanding.tsx";
import OverflowContainer from '../common/OverflowContainer.tsx';

export default function AppHome() {

  const channel = new BroadcastChannel('oauth_channel');
  channel.onmessage = (event) => {
    if (event.data === 'oauth_complete') {
    }
  };

  return (
    <OverflowContainer>
      <CreatorLanding />
    </OverflowContainer>
  )
}
