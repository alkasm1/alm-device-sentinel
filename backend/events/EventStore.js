export class EventStore {
  constructor() {
    this.events = [];
  }

  add(event) {
    this.events.push(event);
    return event;
  }

  addMany(events = []) {
    for (const event of events) {
      this.add(event);
    }

    return events;
  }

  getAll() {
    return [...this.events];
  }

  getByDeviceId(deviceId) {
    return this.events.filter(
      event => event.deviceId === deviceId
    );
  }

  getByType(type) {
    return this.events.filter(
      event => event.type === type
    );
  }

  clear() {
    this.events = [];
  }

  count() {
    return this.events.length;
  }
}
