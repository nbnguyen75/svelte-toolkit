import {
	useCloned,
	useDark,
	useObjectUrl,
	useScriptTag,
	useStyleTag,
	useToggle,
	type ClonedSnapshot,
	type UseClonedReturn,
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

console.log(n, modified, css, tag, pending, url, dark, toggled);
