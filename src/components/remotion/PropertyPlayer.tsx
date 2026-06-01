'use client'

import type { ComponentProps } from 'react'
import { Player } from '@remotion/player'
import { PropertyComposition } from '@/remotion/PropertyComposition'

interface Props {
  property: Record<string, unknown>
  audioUrl?: string
  durationInFrames: number
}

export default function PropertyPlayer({ property, audioUrl, durationInFrames }: Props) {
  return (
    <Player
      component={PropertyComposition}
      inputProps={{ property, audioUrl } as unknown as ComponentProps<typeof PropertyComposition>}
      durationInFrames={durationInFrames}
      compositionWidth={1080}
      compositionHeight={1920}
      fps={30}
      style={{ width: '100%', height: '100%', borderRadius: '8px' }}
      controls
      autoPlay
      loop
    />
  )
}
