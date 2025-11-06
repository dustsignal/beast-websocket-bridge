// beast-parser.js - Parses binary Beast frames into aircraft objects

export class BeastParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
    this.aircraft = new Map(); // hex -> aircraft data
  }

  // Process incoming Beast data stream
  processData(data) {
    // Append to buffer
    this.buffer = Buffer.concat([this.buffer, data]);

    const updates = [];
    let pos = 0;

    // Parse Beast frames - each starts with 0x1a
    while (pos < this.buffer.length) {
      // Look for frame start marker (0x1a)
      const frameStart = this.buffer.indexOf(0x1a, pos);
      if (frameStart === -1) {
        // No complete frame, keep remainder
        this.buffer = this.buffer.slice(pos);
        break;
      }

      if (frameStart > pos) {
        pos = frameStart;
      }

      // Check if we have enough data for a complete frame
      // Minimum frame: 1a [type] [13 bytes data] = 15 bytes
      if (pos + 15 > this.buffer.length) {
        this.buffer = this.buffer.slice(pos);
        break;
      }

      const frameType = this.buffer[pos + 1];

      // DF11 (17-byte message) = 0x8d
      // DF17/18 (17-byte message) = 0x8c
      // DF0 (short msg) = 0x80, DF4/5 (short) = 0x81, etc.

      let frameLen = 15; // Default for short frames
      if (frameType === 0x8d || frameType === 0x8c) {
        frameLen = 23; // Long frames (DF11, DF17/18)
      }

      if (pos + frameLen > this.buffer.length) {
        this.buffer = this.buffer.slice(pos);
        break;
      }

      // Extract frame (skip 0x1a marker and type byte, get data)
      const frame = this.buffer.slice(pos + 2, pos + frameLen);
      pos += frameLen;

      // Parse the frame
      const aircraft = this.parseFrame(frameType, frame);
      if (aircraft) {
        // Update or add aircraft
        const hex = aircraft.hex;
        const existing = this.aircraft.get(hex) || {};
        const updated = { ...existing, ...aircraft, timestamp: Date.now() };
        this.aircraft.set(hex, updated);
        updates.push(updated);
      }
    }

    return Array.from(this.aircraft.values());
  }

  parseFrame(frameType, frame) {
    // DF17/18 messages (airborne position, velocity, ID, etc.)
    if (frameType === 0x8d) {
      return this.parseDF17(frame);
    }
    // DF11 messages (acquisition squitter)
    if (frameType === 0x8c) {
      return this.parseDF11(frame);
    }
    return null;
  }

  parseDF17(frame) {
    // Simplified DF17/18 parsing
    // ICAO address: bytes 0-2 (24 bits)
    const hex = frame
      .slice(0, 3)
      .toString('hex')
      .toUpperCase();

    // Type code in byte 3, bits 3-7
    const typeCode = (frame[3] >> 3) & 0x1f;

    // TC 1-4: Aircraft identification
    // TC 5-8: Surface position
    // TC 9-22: Airborne position
    // TC 19: Airborne velocity

    const aircraft = { hex };

    if (typeCode >= 1 && typeCode <= 4) {
      // Aircraft ID/callsign
      aircraft.flight = this.decodeCallsign(frame.slice(4, 8)).trim();
    } else if (typeCode >= 9 && typeCode <= 22) {
      // Airborne position (odd/even frames)
      const [lat, lon, alt] = this.decodeAirbornePosition(frame);
      if (lat !== null) aircraft.lat = lat;
      if (lon !== null) aircraft.lon = lon;
      if (alt !== null) aircraft.alt_baro = alt;
    } else if (typeCode === 19) {
      // Velocity
      const [gs, track] = this.decodeVelocity(frame);
      if (gs !== null) aircraft.gs = gs;
      if (track !== null) aircraft.track = track;
    }

    return Object.keys(aircraft).length > 1 ? aircraft : null;
  }

  parseDF11(frame) {
    // DF11: Acquisition squitter (simpler, just ICAO code)
    const hex = frame
      .slice(0, 3)
      .toString('hex')
      .toUpperCase();

    return { hex };
  }

  decodeCallsign(data) {
    // Simplified - real implementation decodes 6-bit characters
    // For now, return hex representation
    return data.toString('hex');
  }

  decodeAirbornePosition(frame) {
    // Simplified - real implementation uses even/odd frame pairing
    // Returns [lat, lon, altitude]
    // This is complex and requires CPR (Compact Position Reporting)
    // For MVP, return nulls
    return [null, null, null];
  }

  decodeVelocity(frame) {
    // Simplified - real implementation extracts velocity components
    // Returns [groundSpeed, track]
    return [null, null];
  }

  clear() {
    this.aircraft.clear();
  }
}
