export default function ResultsPanel({title,summary,retry,configure,analyze,explorer}:{title:string|null;summary:string;retry:()=>void;configure:()=>void;analyze:()=>void;explorer:()=>void}){
 return <section className="results-panel" role="status"><div className="eyebrow">EXPERIMENT COMPLETE</div><h2>{title}</h2><p>{summary}</p><div className="result-actions"><button className="primary" onClick={retry}>Retry</button><button onClick={configure}>Adjust & retry</button><button onClick={analyze}>Analyze</button><button onClick={explorer}>Back to Explorer</button></div></section>;
}
