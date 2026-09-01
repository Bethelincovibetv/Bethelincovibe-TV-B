import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import CommunityChatHub from '@/components/chat/CommunityChatHub';

export default function UserMessages() {
  const [searchParams] = useSearchParams();
  const targetUserParam = searchParams.get('targetUserId');
  const officialRoomParam = searchParams.get('officialRoom');
  const roomIdParam = searchParams.get('roomId');

  const initialConvId =
    officialRoomParam === 'true' || officialRoomParam === 'bethelincovibetv'
      ? 'group_official_lounge'
      : roomIdParam || (targetUserParam ? `direct_${targetUserParam}` : undefined);

  return (
    <>
      <Helmet>
        <title>Community Chat & Direct Messaging | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Real-time group community hub and encrypted direct messaging for Bethelincovibe TV members, promoters, and verified merchants."
        />
      </Helmet>

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        <CommunityChatHub initialConversationId={initialConvId} />
      </div>
    </>
  );
}
