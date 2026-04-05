import React from 'react';
import { Composition } from 'remotion';
import { PropertyComposition } from './PropertyComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PropertyReel"
        component={PropertyComposition}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          property: {
            address: "Florida 543",
            price: "USD 199.000",
            type: "Casa",
            operation_type: "Venta",
            location: "GBA Zona Norte, Pilar",
            rooms: 4,
            bedrooms: 3,
            bathrooms: 2,
            surface_total: 280,
            surface_covered: 180,
            photos: [],
          },
        }}
      />
    </>
  );
};
