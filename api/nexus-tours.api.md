# API pública de nexus-tours

> Generado por `npm run api` a partir de `dist/*.d.ts`. No lo edites a mano.
> Si tu PR cambia este archivo, cambia la API: revisa que sea intencional y anótalo en el CHANGELOG.

## `nexus-tours`

```ts
type AdvanceEvent = 'click' | 'dblclick' | 'input' | 'change' | 'submit' | 'focus' | 'blur' | (string & {});

interface AdvanceOn {
    event?: AdvanceEvent;
    target?: TargetRef;
    when?: (e: Event, ctx: StepContext) => boolean;
    until?: (ctx: StepContext) => boolean;
    delay?: number;
}

type Align = 'start' | 'center' | 'end';

type Db = Record<string, Row[]>;

interface FontFace {
    family: string;
    src: string;
    weight?: string | number;
    style?: 'normal' | 'italic';
}

function guide(steps: Step[], options?: Omit<TourOptions, 'steps'>): Tour;

function highlight(element: TargetRef, step?: Omit<Step, 'element'>, options?: Omit<TourOptions, 'steps'>): Tour;

interface Labels {
    next: string;
    previous: string;
    done: string;
    close: string;
    progress: string;
    practice: string;
    never: string;
    skip: string;
}

const PASS: unique symbol;

interface PersistOptions {
    id: string;
    storage?: PersistStorage | null;
    version?: string | number;
    dontShowAgain?: boolean;
}

interface PersistStorage {
    get(key: string): string | null | undefined | Promise<string | null | undefined>;
    set(key: string, value: string): void | Promise<void>;
    remove?(key: string): void | Promise<void>;
}

interface PracticeOptions {
    data?: Db;
    rest?: Record<string, string | {
        path: string;
        idField?: string;
    }>;
    routes?: PracticeRoute[];
    latency?: number;
    blockWrites?: boolean;
    strict?: boolean;
    allow?: (req: {
        method: string;
        url: URL;
    }) => boolean;
    xhr?: boolean;
    banner?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
    onBlocked?: (info: {
        method: string;
        url: string;
    }) => void;
}

interface PracticeRequest {
    method: string;
    url: URL;
    headers: Headers;
    body: unknown;
    params: Record<string, string>;
    db: Db;
}

interface PracticeRoute {
    method?: string | string[];
    url: string | RegExp;
    respond: (req: PracticeRequest) => unknown | Response | Promise<unknown | Response>;
}

interface Router {
    current(): string;
    go(path: string): unknown | Promise<unknown>;
    reloads?: boolean;
}

const routers: {
    history: () => Router;
    location: () => Router;
};

type Row = Record<string, unknown>;

type Side = 'top' | 'bottom' | 'left' | 'right' | 'auto';

interface Step {
    id?: string;
    element?: TargetRef;
    title?: string;
    description?: string;
    content?: (ctx: StepContext) => Node | string | null | undefined;
    side?: Side;
    align?: Align;
    popover?: boolean;
    before?: (ctx: StepContext) => void | Promise<void>;
    after?: (ctx: StepContext) => void | Promise<void>;
    waitTimeout?: number;
    onMissing?: 'skip' | 'stop';
    allowTargetClick?: boolean;
    padding?: number;
    advanceOn?: AdvanceEvent | AdvanceOn;
    hint?: string;
    hideNext?: boolean;
    beforeClick?: string | string[];
    afterClick?: string | string[];
    icon?: string;
    image?: string;
    route?: string;
}

interface StepContext {
    index: number;
    total: number;
    step: Step;
    element: Element | null;
    tour: TourApi;
    reason?: StopReason;
}

type StopReason = 'skip' | 'close' | 'esc' | 'backdrop' | 'dismiss' | 'missing' | 'api';

type TargetRef = string | Element | (() => Element | null | undefined);

interface Theme {
    accent?: string;
    accentContrast?: string;
    background?: string;
    text?: string;
    muted?: string;
    border?: string;
    overlay?: string;
    radius?: string;
    font?: string;
    zIndex?: number;
    fontSize?: string;
    width?: string;
}

function themeVars(theme?: Theme): Record<string, string>;

class Tour implements TourApi {
    constructor(options: TourOptions);
    get index(): number;
    get active(): boolean;
    get practiceData(): import("./practice.js").Db | undefined;
    on(event: TourEvent, fn: (ctx: StepContext) => void): () => void;
    status(): Promise<TourStatus>;
    startIfNeeded(): Promise<boolean>;
    reset(): Promise<void>;
    start(step?: number | string): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
    goTo(step: number | string): Promise<void>;
    stop(): void;
    destroy(): void;
}

interface TourAnalyticsEvent {
    type: TourEvent;
    tourId?: string;
    index: number;
    total: number;
    stepId?: string;
    title?: string;
    reason?: StopReason;
    elapsed: number;
    stepElapsed: number;
}

interface TourApi {
    start(step?: number | string): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
    goTo(step: number | string): Promise<void>;
    stop(): void;
    destroy(): void;
    readonly index: number;
    readonly active: boolean;
    readonly practiceData: Record<string, Record<string, unknown>[]> | undefined;
    on(event: TourEvent, fn: (ctx: StepContext) => void): () => void;
    status(): Promise<TourStatus>;
    startIfNeeded(): Promise<boolean>;
    reset(): Promise<void>;
}

type TourEvent = 'start' | 'step' | 'next' | 'previous' | 'missing' | 'end' | 'stop';

interface TourOptions {
    steps: Step[];
    id?: string;
    onEvent?: (event: TourAnalyticsEvent) => void;
    labels?: Partial<Labels>;
    waitTimeout?: number;
    onMissing?: 'skip' | 'stop';
    closeOnBackdrop?: boolean;
    closeOnEsc?: boolean;
    keyboard?: boolean;
    showProgress?: boolean;
    padding?: number;
    align?: Align;
    modalSelector?: string;
    container?: HTMLElement;
    nonce?: string;
    theme?: Theme;
    font?: string;
    fonts?: FontFace[];
    css?: string;
    practice?: PracticeOptions;
    arrow?: boolean;
    dir?: 'ltr' | 'rtl' | 'auto';
    progress?: 'dots' | 'text' | 'both';
    skip?: boolean;
    closeButton?: boolean;
    celebrate?: boolean;
    mobile?: 'auto' | 'always' | 'never';
    mobileBreakpoint?: number;
    router?: Router | 'history' | 'location';
    persist?: PersistOptions;
    className?: string;
}

type TourStatus = 'new' | 'in-progress' | 'completed' | 'dismissed';
```

## `nexus-tours/all`

```ts
type AdvanceEvent = 'click' | 'dblclick' | 'input' | 'change' | 'submit' | 'focus' | 'blur' | (string & {});

interface AdvanceOn {
    event?: AdvanceEvent;
    target?: TargetRef;
    when?: (e: Event, ctx: StepContext) => boolean;
    until?: (ctx: StepContext) => boolean;
    delay?: number;
}

type Align = 'start' | 'center' | 'end';

function autoTheme(): Theme;

class Checklist {
    readonly ready: Promise<void>;
    constructor(options: ChecklistOptions);
    get items(): {
        done: boolean;
        id: string;
        title: string;
        description?: string;
        tour?: Step[] | (() => Tour);
        onSelect?: () => void;
    }[];
    get dismissedState(): boolean;
    isDone(id: string): boolean;
    progress(): ChecklistProgress;
    markDone(id: string): void;
    unmark(id: string): void;
    reset(): void;
    on(event: 'change' | 'complete', fn: Listener): () => undefined;
    start(id: string): Promise<void>;
    open(): void;
    close(): void;
    toggle(): void;
    hide(): void;
    show(): void;
    mount(container?: HTMLElement): this;
    unmount(): void;
}

function createChecklist(options: ChecklistOptions): Checklist;

function createFixtures<S extends Schema>(schema: S, options?: FixtureOptions): {
    [K in keyof S]: Record<string, unknown>[];
};

type Db = Record<string, Row[]>;

const fake: {
    id: (start?: number) => Generator<number>;
    uuid: () => Generator<string>;
    firstName: () => Generator<string>;
    lastName: () => Generator<string>;
    name: () => Generator<string>;
    company: () => Generator<string>;
    email: (opts?: {
        from?: string;
        domain?: string;
    }) => Generator<string>;
    phone: () => Generator<string>;
    int: (min: number, max: number) => Generator<number>;
    float: (min: number, max: number, decimals?: number) => Generator<number>;
    bool: (probability?: number) => Generator<boolean>;
    pick: <T>(list: readonly T[]) => Generator<T>;
    words: (n?: number) => Generator<string>;
    date: (opts?: {
        past?: number;
        future?: number;
        now?: Date;
    }) => Generator<string>;
};

interface FontFace {
    family: string;
    src: string;
    weight?: string | number;
    style?: 'normal' | 'italic';
}

function guide(steps: Step[], options?: Omit<TourOptions, 'steps'>): Tour;

function highlight(element: TargetRef, step?: Omit<Step, 'element'>, options?: Omit<TourOptions, 'steps'>): Tour;

interface Labels {
    next: string;
    previous: string;
    done: string;
    close: string;
    progress: string;
    practice: string;
    never: string;
    skip: string;
}

const liveFetch: typeof fetch;

const PASS: unique symbol;

interface PersistOptions {
    id: string;
    storage?: PersistStorage | null;
    version?: string | number;
    dontShowAgain?: boolean;
}

interface PersistStorage {
    get(key: string): string | null | undefined | Promise<string | null | undefined>;
    set(key: string, value: string): void | Promise<void>;
    remove?(key: string): void | Promise<void>;
}

interface PracticeOptions {
    data?: Db;
    rest?: Record<string, string | {
        path: string;
        idField?: string;
    }>;
    routes?: PracticeRoute[];
    latency?: number;
    blockWrites?: boolean;
    strict?: boolean;
    allow?: (req: {
        method: string;
        url: URL;
    }) => boolean;
    xhr?: boolean;
    banner?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
    onBlocked?: (info: {
        method: string;
        url: string;
    }) => void;
}

interface PracticeRequest {
    method: string;
    url: URL;
    headers: Headers;
    body: unknown;
    params: Record<string, string>;
    db: Db;
}

interface PracticeRoute {
    method?: string | string[];
    url: string | RegExp;
    respond: (req: PracticeRequest) => unknown | Response | Promise<unknown | Response>;
}

interface Router {
    current(): string;
    go(path: string): unknown | Promise<unknown>;
    reloads?: boolean;
}

const routers: {
    history: () => Router;
    location: () => Router;
};

type Row = Record<string, unknown>;

type Side = 'top' | 'bottom' | 'left' | 'right' | 'auto';

interface Step {
    id?: string;
    element?: TargetRef;
    title?: string;
    description?: string;
    content?: (ctx: StepContext) => Node | string | null | undefined;
    side?: Side;
    align?: Align;
    popover?: boolean;
    before?: (ctx: StepContext) => void | Promise<void>;
    after?: (ctx: StepContext) => void | Promise<void>;
    waitTimeout?: number;
    onMissing?: 'skip' | 'stop';
    allowTargetClick?: boolean;
    padding?: number;
    advanceOn?: AdvanceEvent | AdvanceOn;
    hint?: string;
    hideNext?: boolean;
    beforeClick?: string | string[];
    afterClick?: string | string[];
    icon?: string;
    image?: string;
    route?: string;
}

interface StepContext {
    index: number;
    total: number;
    step: Step;
    element: Element | null;
    tour: TourApi;
    reason?: StopReason;
}

type StopReason = 'skip' | 'close' | 'esc' | 'backdrop' | 'dismiss' | 'missing' | 'api';

function supabasePractice(o: SupabasePracticeOptions): PracticeOptions;

type TargetRef = string | Element | (() => Element | null | undefined);

interface Theme {
    accent?: string;
    accentContrast?: string;
    background?: string;
    text?: string;
    muted?: string;
    border?: string;
    overlay?: string;
    radius?: string;
    font?: string;
    zIndex?: number;
    fontSize?: string;
    width?: string;
}

const themes: {
    readonly light: Theme;
    readonly dark: Theme;
    readonly ocean: Theme;
    readonly sunset: Theme;
    readonly mint: Theme;
    readonly rose: Theme;
    readonly mono: Theme;
    readonly bootstrap: Theme;
    readonly tailwind: Theme;
    readonly shadcn: Theme;
    readonly daisyui: Theme;
    readonly vuetify: Theme;
    readonly mui: Theme;
    readonly sweetalert2: Theme;
};

function themeVars(theme?: Theme): Record<string, string>;

class Tour implements TourApi {
    constructor(options: TourOptions);
    get index(): number;
    get active(): boolean;
    get practiceData(): import("./practice.js").Db | undefined;
    on(event: TourEvent, fn: (ctx: StepContext) => void): () => void;
    status(): Promise<TourStatus>;
    startIfNeeded(): Promise<boolean>;
    reset(): Promise<void>;
    start(step?: number | string): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
    goTo(step: number | string): Promise<void>;
    stop(): void;
    destroy(): void;
}

interface TourAnalyticsEvent {
    type: TourEvent;
    tourId?: string;
    index: number;
    total: number;
    stepId?: string;
    title?: string;
    reason?: StopReason;
    elapsed: number;
    stepElapsed: number;
}

interface TourApi {
    start(step?: number | string): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
    goTo(step: number | string): Promise<void>;
    stop(): void;
    destroy(): void;
    readonly index: number;
    readonly active: boolean;
    readonly practiceData: Record<string, Record<string, unknown>[]> | undefined;
    on(event: TourEvent, fn: (ctx: StepContext) => void): () => void;
    status(): Promise<TourStatus>;
    startIfNeeded(): Promise<boolean>;
    reset(): Promise<void>;
}

type TourEvent = 'start' | 'step' | 'next' | 'previous' | 'missing' | 'end' | 'stop';

interface TourOptions {
    steps: Step[];
    id?: string;
    onEvent?: (event: TourAnalyticsEvent) => void;
    labels?: Partial<Labels>;
    waitTimeout?: number;
    onMissing?: 'skip' | 'stop';
    closeOnBackdrop?: boolean;
    closeOnEsc?: boolean;
    keyboard?: boolean;
    showProgress?: boolean;
    padding?: number;
    align?: Align;
    modalSelector?: string;
    container?: HTMLElement;
    nonce?: string;
    theme?: Theme;
    font?: string;
    fonts?: FontFace[];
    css?: string;
    practice?: PracticeOptions;
    arrow?: boolean;
    dir?: 'ltr' | 'rtl' | 'auto';
    progress?: 'dots' | 'text' | 'both';
    skip?: boolean;
    closeButton?: boolean;
    celebrate?: boolean;
    mobile?: 'auto' | 'always' | 'never';
    mobileBreakpoint?: number;
    router?: Router | 'history' | 'location';
    persist?: PersistOptions;
    className?: string;
}

type TourStatus = 'new' | 'in-progress' | 'completed' | 'dismissed';
```

## `nexus-tours/fixtures`

```ts
function createFixtures<S extends Schema>(schema: S, options?: FixtureOptions): {
    [K in keyof S]: Record<string, unknown>[];
};

const fake: {
    id: (start?: number) => Generator<number>;
    uuid: () => Generator<string>;
    firstName: () => Generator<string>;
    lastName: () => Generator<string>;
    name: () => Generator<string>;
    company: () => Generator<string>;
    email: (opts?: {
        from?: string;
        domain?: string;
    }) => Generator<string>;
    phone: () => Generator<string>;
    int: (min: number, max: number) => Generator<number>;
    float: (min: number, max: number, decimals?: number) => Generator<number>;
    bool: (probability?: number) => Generator<boolean>;
    pick: <T>(list: readonly T[]) => Generator<T>;
    words: (n?: number) => Generator<string>;
    date: (opts?: {
        past?: number;
        future?: number;
        now?: Date;
    }) => Generator<string>;
};

interface FixtureOptions {
    seed?: number;
    locale?: Locale;
}

interface GenContext {
    rng: () => number;
    locale: Locale;
    index: number;
    row: Record<string, unknown>;
}

type Generator<T = unknown> = (ctx: GenContext) => T;

type Locale = 'es' | 'en';

type Schema = Record<string, TableSchema>;

interface TableSchema {
    count: number;
    fields: Record<string, Generator | string | number | boolean | null>;
}
```

## `nexus-tours/themes`

```ts
function autoTheme(): Theme;

const bootstrap: Theme;

const daisyui: Theme;

const dark: Theme;

const light: Theme;

const mint: Theme;

const mono: Theme;

const mui: Theme;

const ocean: Theme;

const rose: Theme;

const shadcn: Theme;

const sunset: Theme;

const sweetalert2: Theme;

const tailwind: Theme;

const themes: {
    readonly light: Theme;
    readonly dark: Theme;
    readonly ocean: Theme;
    readonly sunset: Theme;
    readonly mint: Theme;
    readonly rose: Theme;
    readonly mono: Theme;
    readonly bootstrap: Theme;
    readonly tailwind: Theme;
    readonly shadcn: Theme;
    readonly daisyui: Theme;
    readonly vuetify: Theme;
    readonly mui: Theme;
    readonly sweetalert2: Theme;
};

const vuetify: Theme;
```

## `nexus-tours/vue`

```ts
const NexusTour: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    steps: {
        type: PropType<Step[]>;
        required: true;
    };
    options: {
        type: PropType<Omit<TourOptions, "steps">>;
        default: () => {};
    };
    modelValue: {
        type: BooleanConstructor;
        default: boolean;
    };
    startAt: {
        type: (StringConstructor | NumberConstructor)[];
        default: number;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>[] | undefined, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("start" | "end" | "missing" | "stop" | "step" | "next" | "previous" | "update:modelValue")[], "start" | "end" | "missing" | "stop" | "step" | "next" | "previous" | "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    steps: {
        type: PropType<Step[]>;
        required: true;
    };
    options: {
        type: PropType<Omit<TourOptions, "steps">>;
        default: () => {};
    };
    modelValue: {
        type: BooleanConstructor;
        default: boolean;
    };
    startAt: {
        type: (StringConstructor | NumberConstructor)[];
        default: number;
    };
}>> & Readonly<{
    onMissing?: ((...args: any[]) => any) | undefined;
    onStart?: ((...args: any[]) => any) | undefined;
    onEnd?: ((...args: any[]) => any) | undefined;
    onStep?: ((...args: any[]) => any) | undefined;
    onNext?: ((...args: any[]) => any) | undefined;
    onPrevious?: ((...args: any[]) => any) | undefined;
    onStop?: ((...args: any[]) => any) | undefined;
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
}>, {
    startAt: string | number;
    options: Omit<TourOptions, "steps">;
    modelValue: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type TourHandlers = Partial<Record<TourEvent, (ctx: StepContext) => void>>;

function useChecklist(options: ChecklistOptions, { mount }?: {
    mount?: boolean;
}): {
    checklist: Checklist;
    items: import("vue").ComputedRef<{
        done: boolean;
        id: string;
        title: string;
        description?: string;
        tour?: Step[] | (() => Tour);
        onSelect?: () => void;
    }[]>;
    progress: import("vue").ComputedRef<import("nexus-tours/checklist").ChecklistProgress>;
    done: import("vue").ComputedRef<number>;
    total: import("vue").ComputedRef<number>;
    complete: import("vue").ComputedRef<boolean>;
    start: (id: string) => Promise<void>;
    markDone: (id: string) => void;
    reset: () => void;
    open: () => void;
    close: () => void;
    show: () => void;
    hide: () => void;
};

function useTour(options: UseTourOptions | (() => UseTourOptions), handlers?: TourHandlers): {
    start: (at?: number | string) => Promise<void>;
    stop: () => void | undefined;
    next: () => Promise<void> | undefined;
    previous: () => Promise<void> | undefined;
    goTo: (step: number | string) => Promise<void> | undefined;
    active: import("vue").Ref<boolean, boolean>;
    index: import("vue").Ref<number, number>;
    tour: import("vue").ShallowRef<Tour | null, Tour | null>;
};

type UseTourOptions = Omit<TourOptions, 'steps'> & {
    steps: Step[];
};
```

## `nexus-tours/react`

```ts
function NexusTour(props: NexusTourProps): import("react").DetailedReactHTMLElement<{
    hidden: true;
    'data-nexus-tour-anchor': string;
}, HTMLElement>;

interface NexusTourProps extends Omit<TourOptions, 'steps'> {
    steps: Step[];
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    startAt?: number | string;
    onStart?: (ctx: StepContext) => void;
    onStep?: (ctx: StepContext) => void;
    onNext?: (ctx: StepContext) => void;
    onPrevious?: (ctx: StepContext) => void;
    onTargetMissing?: (ctx: StepContext) => void;
    onEnd?: (ctx: StepContext) => void;
    onStop?: (ctx: StepContext) => void;
    children?: ReactNode;
}

type TourHandlers = Partial<Record<TourEvent, (ctx: StepContext) => void>>;

function useChecklist(options: ChecklistOptions, { mount }?: {
    mount?: boolean;
}): {
    start: (id: string) => Promise<void>;
    markDone: (id: string) => void;
    reset: () => void;
    open: () => void;
    close: () => void;
    show: () => void;
    hide: () => void;
    done: number;
    total: number;
    complete: boolean;
    checklist: Checklist;
    items: {
        done: boolean;
        id: string;
        title: string;
        description?: string;
        tour?: Step[] | (() => Tour);
        onSelect?: () => void;
    }[];
};

function useTour(options: UseTourOptions, handlers?: TourHandlers): {
    start: (at?: number | string) => Promise<void>;
    stop: () => void | undefined;
    next: () => Promise<void> | undefined;
    previous: () => Promise<void> | undefined;
    goTo: (step: number | string) => Promise<void> | undefined;
    active: boolean;
    index: number;
};

type UseTourOptions = Omit<TourOptions, 'steps'> & {
    steps: Step[];
};
```

## `nexus-tours/builder`

```ts
function bestSelector(el: Element): string;

interface BuilderOptions {
    id?: string;
    storage?: BuilderStorage | null;
    lang?: 'es' | 'en';
    theme?: Theme;
    steps?: JSONStep[];
    tourOptions?: Omit<TourOptions, 'steps'>;
    onSave?: (json: TourJSON) => void | Promise<void>;
    onChange?: (json: TourJSON) => void;
    onClose?: () => void;
}

interface BuilderStorage {
    get(key: string): string | null | undefined | Promise<string | null | undefined>;
    set(key: string, value: string): void | Promise<void>;
}

type JSONStep = Omit<Step, 'element' | 'before' | 'after' | 'advanceOn' | 'allowTargetClick' | 'content'> & {
    element?: string;
    advanceOn?: 'click';
};

class TourBuilder {
    readonly ready: Promise<void>;
    constructor(options?: BuilderOptions);
    get isOpen(): boolean;
    toJSON(): TourJSON;
    toCode(): string;
    load(json: TourJSON | JSONStep[]): void;
    clear(): void;
    open(): this;
    close(): void;
    destroy(): void;
}

interface TourJSON {
    version: 1;
    steps: JSONStep[];
}
```

## `nexus-tours/supabase`

```ts
const liveFetch: typeof fetch;

interface Relation {
    table: string;
    from: string;
    to?: string;
    many?: boolean;
}

function supabasePractice(o: SupabasePracticeOptions): PracticeOptions;

interface SupabasePracticeOptions extends Omit<PracticeOptions, 'rest'> {
    url?: string;
    primaryKeys?: Record<string, string>;
    relations?: Record<string, Record<string, Relation>>;
    rpc?: Record<string, (ctx: {
        args: any;
        db: Db;
        req: PracticeRequest;
    }) => unknown>;
    functions?: Record<string, (ctx: {
        body: any;
        db: Db;
        req: PracticeRequest;
    }) => unknown>;
    defaults?: Record<string, Record<string, unknown | ((ctx: {
        row: Row;
        db: Db;
        table: string;
    }) => unknown)>>;
    allowRpc?: string[];
}
```

## `nexus-tours/checklist`

```ts
class Checklist {
    readonly ready: Promise<void>;
    constructor(options: ChecklistOptions);
    get items(): {
        done: boolean;
        id: string;
        title: string;
        description?: string;
        tour?: Step[] | (() => Tour);
        onSelect?: () => void;
    }[];
    get dismissedState(): boolean;
    isDone(id: string): boolean;
    progress(): ChecklistProgress;
    markDone(id: string): void;
    unmark(id: string): void;
    reset(): void;
    on(event: 'change' | 'complete', fn: Listener): () => undefined;
    start(id: string): Promise<void>;
    open(): void;
    close(): void;
    toggle(): void;
    hide(): void;
    show(): void;
    mount(container?: HTMLElement): this;
    unmount(): void;
}

interface ChecklistItem {
    id: string;
    title: string;
    description?: string;
    tour?: Step[] | (() => Tour);
    onSelect?: () => void;
}

interface ChecklistLabels {
    title: string;
    progress: string;
    start: string;
    review: string;
    reset: string;
    hide: string;
    complete: string;
    open: string;
    close: string;
    completed: string;
    pending: string;
}

interface ChecklistOptions {
    id: string;
    items: ChecklistItem[];
    tourOptions?: Omit<TourOptions, 'steps'>;
    theme?: Theme;
    font?: string;
    css?: string;
    className?: string;
    dir?: 'ltr' | 'rtl' | 'auto';
    position?: 'bottom-end' | 'bottom-start';
    storage?: ChecklistStorage | null;
    storageKey?: string;
    labels?: Partial<ChecklistLabels>;
    autoOpen?: boolean;
    onComplete?: () => void;
    container?: HTMLElement;
}

interface ChecklistProgress {
    done: number;
    total: number;
    complete: boolean;
}

interface ChecklistStorage {
    get(key: string): string | null | undefined | Promise<string | null | undefined>;
    set(key: string, value: string): void | Promise<void>;
    remove?(key: string): void | Promise<void>;
}

function createChecklist(options: ChecklistOptions): Checklist;
```
