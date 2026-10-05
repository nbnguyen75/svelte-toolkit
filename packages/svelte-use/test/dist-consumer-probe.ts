import {
	useBase64,
	useCloned,
	useControllableState,
	useDark,
	useObjectUrl,
	usePrecision,
	useScriptTag,
	useStyleTag,
	useToggle,
	type Base64Target,
	type ClonedSnapshot,
	type UseBase64Return,
	type UseClonedReturn,
	type UseControllableStateReturn,
	type UsePrecisionReturn,
	type UseScriptTagReturn,
	type UseStyleTagReturn
} from '../dist/index.js';

const cloned: UseClonedReturn<ClonedSnapshot<{ n: number }>> = useCloned({ n: 1 });
const n: number = cloned.value.n;
const modified: boolean = cloned.isModified;
cloned.sync();

const style: UseStyleTagReturn = useStyleTag('a{}', { id: 'probe' });
const css: string = style.css;

const script: UseScriptTagReturn = useScriptTag('https://cdn.example/lib.js');
const tag: HTMLScriptElement | undefined = script.scriptTag;
const pending: Promise<HTMLScriptElement | false> = script.load();

const url: string | undefined = useObjectUrl(new Blob(['a'])).value;
const dark: boolean = useDark().value;
const toggled: boolean = useToggle().value;

const source: Base64Target = { test: 5 };
const encoded: UseBase64Return = useBase64(() => source, { dataUrl: false });
const payload: string = encoded.base64;
const inFlight: Promise<string> | undefined = encoded.promise;
const rerun: Promise<string> = encoded.execute();

const precise: UsePrecisionReturn = usePrecision(45.125, 2, { math: 'round' });
const rounded: number = precise.value;

const open: UseControllableStateReturn<boolean> = useControllableState({ defaultValue: false });
open.value = true;
const isOpen: boolean | undefined = open.value;

console.log(
	n,
	modified,
	css,
	tag,
	pending,
	url,
	dark,
	toggled,
	payload,
	inFlight,
	rerun,
	rounded,
	isOpen
);
