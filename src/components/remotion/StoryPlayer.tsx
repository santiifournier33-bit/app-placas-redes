'use client'

import { Player } from '@remotion/player'
import { StoryPlacaComposition } from '@/remotion/StoryPlacaComposition'

interface Props {
  property: Record<string, unknown>
  format: 'story' | 'square'
}

export default function StoryPlayer({ property, format }: Props) {
  return (
    <Player
      component={StoryPlacaComposition}
      inputProps={{ property, format }}
      durationInFrames={1}
      compositionWidth={1080}
      compositionHeight={format === 'story' ? 1920 : 1080}
      fps={30}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
