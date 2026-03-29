import React, { useState } from 'react';
import '../main.css';

export default function App() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState('System ready. Connect to 127.0.0.1:5555.');
    const [tables, setTables] = useState<string[]>([]);

    const executeQuery = async (sql: string) => {
        if (!sql.trim()) return;
        setResults('Executing Query...');
        
        try {
            // Call our Electron IPC handler
            if ((window as any).api && (window as any).api.queryDB) {
                const response = await (window as any).api.queryDB(sql);
                setResults(response || "(No Output)");
            } else {
                setResults(`[Web View Only] Received:\n${sql}\n\nNote: Electron IPC (window.api.queryDB) not detected.\nPlease add it to your main.js and preload.js to connect to TCP 127.0.0.1:5555.`);
            }
        } catch (err: any) {
            setResults(`Execution Error:\n${err.message || err}`);
        }
    };

    const fetchTables = async () => {
        setTables(['Loading...']);
        try {
            if ((window as any).api && (window as any).api.queryDB) {
                const response = await (window as any).api.queryDB('SHOW TABLES');
                const lines = response.split('\n');
                
                // The DB returns tables formatted as "- tablename"
                const parsedTables = lines
                    .filter((l: string) => l.startsWith('- '))
                    .map((l: string) => l.substring(2));
                
                setTables(parsedTables.length > 0 ? parsedTables : ['No tables found']);
            } else {
                setTables(['No IPC connection']);
            }
        } catch (err) {
            setTables(['Failed to fetch']);
        }
    };

    return (
        <div className="main-content">
            <aside className="sidebar">
                <h3>Database</h3>
                <ul id="table-list">
                    {tables.map((table, i) => (
                        <li key={i} onClick={() => {
                            if (table !== 'Loading...' && table !== 'No IPC connection' && table !== 'No tables found' && table !== 'Failed to fetch') {
                                setQuery(`SELECT * FROM ${table}`);
                            }
                        }}>
                            {table}
                        </li>
                    ))}
                </ul>
                <button className="secondary-btn" onClick={fetchTables}>Refresh Tables</button>
            </aside>
            
            <div className="workspace">
                <div className="editor-section">
                    <textarea 
                        id="sql-editor" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Write your SQL query here...&#10;Example: SELECT * FROM users"
                    />
                    <div className="editor-actions">
                        <button className="primary-btn" onClick={() => executeQuery(query)}>▶ Run Query</button>
                        <button className="secondary-btn" onClick={() => setQuery('')}>Clear</button>
                    </div>
                </div>
                
                <div className="results-section">
                    <div className="results-header">Output</div>
                    <div className="results-container">
                        <pre id="results-output" className={results.startsWith('Execution Error') ? 'output-error' : ''}>
                            {results}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}