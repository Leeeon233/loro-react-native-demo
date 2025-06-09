// Mock implementation for demonstration purposes
// You'll need to run: npm install loro-crdt
// import {LoroDoc} from 'loro-crdt';

export class MockLoroDoc {
    private content: string = '';
    private listeners: Array<() => void> = [];

    getText() {
        return {
            insert: (pos: number, text: string) => {
                this.content = this.content.slice(0, pos) + text + this.content.slice(pos);
                this.notifyListeners();
            },
            delete: (pos: number, len: number) => {
                this.content = this.content.slice(0, pos) + this.content.slice(pos + len);
                this.notifyListeners();
            },
            toString: () => this.content,
            length: () => this.content.length,
        };
    }

    subscribe(callback: () => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    export() {
        return new Uint8Array();
    }

    import(data: Uint8Array) {
        // Mock import
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }
}

// Rich text types for the rich text editor
export interface RichTextSegment {
    text: string;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    size?: number;
}

export class MockRichTextDoc {
    private segments: RichTextSegment[] = [];
    private listeners: Array<() => void> = [];

    insert(pos: number, text: string, attrs?: Partial<RichTextSegment>) {
        const newSegment: RichTextSegment = {
            text,
            ...attrs,
        };
        this.segments.splice(pos, 0, newSegment);
        this.notifyListeners();
    }

    delete(pos: number, len: number) {
        this.segments.splice(pos, len);
        this.notifyListeners();
    }

    format(start: number, end: number, attrs: Partial<RichTextSegment>) {
        for (let i = start; i < Math.min(end, this.segments.length); i++) {
            this.segments[i] = { ...this.segments[i], ...attrs };
        }
        this.notifyListeners();
    }

    getSegments(): RichTextSegment[] {
        return [...this.segments];
    }

    getPlainText(): string {
        return this.segments.map(s => s.text).join('');
    }

    subscribe(callback: () => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }
} 