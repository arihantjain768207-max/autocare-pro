/* FIFO Queue: array + FRONT pointer. Insert at REAR, remove from FRONT. No sorting/priorities. */
class Queue {
  constructor(items = []) { this.items = items.slice(); this.front = 0; }
  get rear() { return this.isEmpty() ? -1 : this.items.length - 1; }
  get size() { return this.items.length - this.front; }
  isEmpty() { return this.size === 0; }
  enqueue(x) { this.items.push(x); return x; }                                   // O(1)
  dequeue() { return this.isEmpty() ? null : this.items[this.front++]; }         // O(1)
  peek() { return this.isEmpty() ? null : this.items[this.front]; }              // O(1)
  display() { return this.items.slice(this.front); }                             // O(n)
}
