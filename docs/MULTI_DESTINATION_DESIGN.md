# Multi-Destination Route Itineraries - Design Document

## Overview

This document outlines the design for supporting multi-destination (multi-stop) route itineraries in RouteWise. This feature allows tour operators to quote and manage complex trips with multiple stops along the way.

## Use Cases

### 1. Tour Packages
- **Example**: San Pedro Sula → Copán Ruinas → Gracias → Comayagua → Tegucigalpa
- Passengers visit multiple tourist destinations in sequence
- May include overnight stays at different locations

### 2. Corporate Events
- **Example**: Pick up executives at Airport → Hotel → Conference Center → Restaurant → Hotel
- Multiple stops within a single day or multi-day event

### 3. School/Church Groups
- **Example**: Church → Retreat Center → Tourist Site → Restaurant → Church
- Group activities with multiple scheduled stops

### 4. Airport Transfers with Stops
- **Example**: Airport → Hotel A → Hotel B → Hotel C (different passengers)
- Shared transfers with multiple drop-off points

## Proposed Data Model

### Quotation Schema Changes

```typescript
// New fields for quotations table
waypoints: v.optional(v.array(v.object({
  location: v.string(),           // Address/place name
  coordinates: v.optional(v.object({
    lat: v.number(),
    lng: v.number(),
  })),
  stopType: v.string(),           // 'pickup' | 'dropoff' | 'visit' | 'overnight'
  estimatedDuration: v.optional(v.number()),  // Minutes at this stop
  overnightStays: v.optional(v.number()),     // Number of nights (for overnight stops)
  notes: v.optional(v.string()),
  order: v.number(),              // Sequence order
}))),

// Route segments between waypoints
routeSegments: v.optional(v.array(v.object({
  fromIndex: v.number(),          // Index in waypoints array
  toIndex: v.number(),            // Index in waypoints array
  distance: v.number(),           // km
  duration: v.number(),           // minutes
  isDeadhead: v.boolean(),        // Is this a repositioning segment?
}))),
```

### Route Result Changes

```typescript
interface MultiStopRouteResult {
  waypoints: WaypointInfo[];
  segments: RouteSegment[];

  // Summary distances
  totalDistance: number;
  clientTripDistance: number;     // Distance with passengers
  deadheadDistance: number;       // Repositioning distance (no passengers)

  // Time breakdown
  totalDrivingTime: number;
  totalStopTime: number;          // Time spent at stops
  totalTripTime: number;          // Driving + stops

  // For cost calculation
  totalDays: number;              // Calculated from durations + overnight stays
  overnightLocations: string[];   // For lodging cost allocation
}
```

## Route Calculation Flow

### Step 1: Collect Waypoints
User adds waypoints in sequence:
1. Base Location (vehicle start)
2. First Pickup (origin)
3. Stop 1, Stop 2, ... Stop N
4. Final Drop-off (destination)
5. Base Location (vehicle return)

### Step 2: Distance Matrix Calculation
Use Google Maps Distance Matrix API to calculate all possible routes:
- For N waypoints, calculate N×N matrix
- Extract required segments based on trip type

### Step 3: Segment Classification
Classify each segment:
- **Deadhead**: Base → First Pickup (no passengers)
- **Client Trip**: All segments with passengers
- **Deadhead**: Final Drop-off → Base (no passengers)

### Step 4: Cost Allocation

| Cost Type | Calculation Method |
|-----------|-------------------|
| Fuel | Total distance × consumption rate |
| Tolls | Sum of tolls on all segments |
| Vehicle Distance | Total distance × per-km rate |
| Vehicle Daily | Total days × daily rate |
| Driver Meals | Total days × meal rate |
| Driver Lodging | (Total days - 1) × lodging rate |
| Driver Incentive | Total days × incentive rate |

## UI Design

### Quotation Form Changes

```
┌────────────────────────────────────────────────────────────┐
│ DETALLES DEL VIAJE                                          │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  Tipo de Viaje:  ○ Punto a Punto    ● Multi-Destino         │
│                                                              │
│  ┌─ PARADAS ─────────────────────────────────────────────┐  │
│  │ 1. [Origen]              San Pedro Sula        [🗑️]  │  │
│  │    └─ 🚐 45 km, 50 min ─────────────────────────────  │  │
│  │ 2. [Parada]              Lago de Yojoa         [🗑️]  │  │
│  │    ⏱️ Tiempo: 2 horas    🌙 Noches: 0                  │  │
│  │    └─ 🚐 60 km, 1h 10 min ────────────────────────    │  │
│  │ 3. [Parada]              Comayagua             [🗑️]  │  │
│  │    ⏱️ Tiempo: 3 horas    🌙 Noches: 1                  │  │
│  │    └─ 🚐 85 km, 1h 30 min ────────────────────────    │  │
│  │ 4. [Destino]             Tegucigalpa           [🗑️]  │  │
│  │                                                        │  │
│  │               [+ Agregar Parada]                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Ida y Vuelta: [✓]   (Regresa siguiendo la misma ruta)      │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Route Summary Display

```
┌─ RESUMEN DE RUTA ─────────────────────────────────────────┐
│                                                            │
│  📍 Total Paradas: 4                                       │
│  🛣️ Distancia Total: 380 km                                │
│  ⏱️ Tiempo de Conducción: 5h 20min                         │
│  🕐 Tiempo en Paradas: 5h                                  │
│  📅 Días Totales: 2 (1 noche)                              │
│                                                            │
│  ┌─ Desglose ──────────────────────────────────────────┐  │
│  │  🔵 Reposicionamiento:     45 km (base → origen)    │  │
│  │  🟢 Viaje con pasajeros:   290 km                   │  │
│  │  🔵 Reposicionamiento:     45 km (destino → base)   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Backend Foundation (Estimated: 2-3 days)
- [ ] Update quotation schema with waypoints and segments
- [ ] Update itinerary schema to match
- [ ] Create RouteCalculationService.calculateMultiStopRoute()
- [ ] Update cost calculation to handle multi-stop

### Phase 2: UI - Waypoint Management (Estimated: 2-3 days)
- [ ] Create WaypointList component (drag-drop reordering)
- [ ] Create WaypointEditor component (stop type, duration, overnight)
- [ ] Integrate with quotation form
- [ ] Show route segments between waypoints

### Phase 3: Map Integration (Estimated: 1-2 days)
- [ ] Display multi-stop route on map
- [ ] Show waypoint markers with labels
- [ ] Allow map-based waypoint selection

### Phase 4: Cost & Pricing (Estimated: 1-2 days)
- [ ] Update cost breakdown for multi-stop
- [ ] Handle overnight stays in different locations
- [ ] Generate itemized pricing

### Phase 5: PDF & Reports (Estimated: 1 day)
- [ ] Update quotation PDF template
- [ ] Update itinerary PDF with stop-by-stop details
- [ ] Invoice description for multi-stop trips

## Technical Considerations

### Google Maps API Usage
- Distance Matrix API: $5 per 1000 elements
- For a 5-stop trip: 5×5 = 25 elements
- Consider caching frequent routes

### Database Indexes
- Add index on `quotations.waypoints` for searching
- Consider denormalizing total distance/time for queries

### Migration Path
- Existing point-to-point quotations continue to work
- New waypoints field is optional
- Origin/destination fields remain for backwards compatibility

## Alternative Approaches Considered

### 1. Linked Quotations
Create separate quotations for each leg, then link them.
- **Pros**: Simpler data model, reuses existing code
- **Cons**: Complex pricing, hard to manage as single trip

### 2. Template-Based Routes
Pre-define popular multi-stop routes as templates.
- **Pros**: Fast for common routes, consistent pricing
- **Cons**: Inflexible, requires maintenance

### 3. Full Waypoint System (Recommended)
Store all waypoints in a single quotation with segment calculations.
- **Pros**: Flexible, accurate pricing, single trip management
- **Cons**: More complex implementation

## Next Steps

1. Review and approve this design
2. Create database migrations for new fields
3. Implement Phase 1 (Backend Foundation)
4. User testing with sample multi-stop trips
5. Iterate based on feedback

## Questions for Product Team

1. Should overnight location affect lodging cost calculation? (Different cities may have different hotel rates)
2. How to handle meal costs at different stops? (Full day vs. half day)
3. Should we support "open jaw" routes? (Different return route than outbound)
4. Maximum number of waypoints to support? (API limits, UI complexity)
