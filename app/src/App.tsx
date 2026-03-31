import { useState } from 'react';
import '../main.css';

export default function App() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState('System ready. Connect to 127.0.0.1:5555.');
    const [tables, setTables] = useState<string[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authMode, setAuthMode] = useState<'setup' | 'login'>('login');
    const [dbName, setDbName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const runSql = async (sql: string): Promise<string> => {
        if (!(window as any).api || !(window as any).api.queryDB) {
            throw new Error('Electron IPC (window.api.queryDB) not detected.');
        }
        return (window as any).api.queryDB(sql);
    };

    const executeQuery = async (sql: string) => {
        if (!isAuthenticated) {
            setResults('Execution Error:\nPlease log in first.');
            return;
        }
        if (!sql.trim()) return;
        setResults('Executing Query...');

        try {
            const response = await runSql(sql);
            setResults(response || '(No Output)');
        } catch (err: any) {
            setResults(`Execution Error:\n${err.message || err}`);
        }
    };

    const fetchTables = async () => {
        setTables(['Loading...']);
        try {
            const response = await runSql('SHOW TABLES');
            const lines = response.split('\n');
            const parsedTables = lines
                .filter((l: string) => l.startsWith('- '))
                .map((l: string) => l.substring(2));
            setTables(parsedTables.length > 0 ? parsedTables : ['No tables found']);
        } catch (err) {
            setTables(['Failed to fetch']);
        }
    };

    const handleSetup = async () => {
        if (!dbName.trim() || !username.trim() || !password.trim()) {
            setResults('Execution Error:\nPlease provide database name, username and password.');
            return;
        }

        const sql = `CREATE DATABASE ${dbName.trim()}\nWITH USER ${username.trim()}\nSET PASSWORD ${password.trim()};`;
        setResults('Creating database...');

        try {
            const response = await runSql(sql);
            setResults(response || '(No Output)');
            if (!response.toLowerCase().startsWith('error')) {
                setIsAuthenticated(true);
                await fetchTables();
            }
        } catch (err: any) {
            setResults(`Execution Error:\n${err.message || err}`);
        }
    };

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            setResults('Execution Error:\nPlease provide username and password.');
            return;
        }

        const sql = `LOGIN USER ${username.trim()} SET PASSWORD ${password.trim()};`;
        setResults('Logging in...');

        try {
            const response = await runSql(sql);
            setResults(response || '(No Output)');
            if (!response.toLowerCase().startsWith('error')) {
                setIsAuthenticated(true);
                await fetchTables();
            }
        } catch (err: any) {
            setResults(`Execution Error:\n${err.message || err}`);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="auth-wrapper">
                <div className="auth-card">
                    <h2>{authMode === 'setup' ? 'Initial Database Setup' : 'Login'}</h2>
                    <p>
                        {authMode === 'setup'
                            ? 'Create your database first. Table creation is locked until setup succeeds.'
                            : 'Login with a valid username and password to continue.'}
                    </p>

                    {authMode === 'setup' && (
                        <input
                            className="auth-input"
                            value={dbName}
                            onChange={(e) => setDbName(e.target.value)}
                            placeholder="Database name"
                        />
                    )}
                    <input
                        className="auth-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                    />
                    <input
                        className="auth-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        type="password"
                    />

                    <button className="primary-btn auth-btn" onClick={authMode === 'setup' ? handleSetup : handleLogin}>
                        {authMode === 'setup' ? 'Create Database' : 'Login'}
                    </button>
                    <button
                        className="secondary-btn auth-btn"
                        onClick={() => setAuthMode(authMode === 'setup' ? 'login' : 'setup')}
                    >
                        {authMode === 'setup' ? 'Already initialized? Login' : 'First start? Setup database'}
                    </button>

                    <pre id="results-output" className={results.startsWith('Execution Error') ? 'output-error' : ''}>
                        {results}
                    </pre>
                </div>
            </div>
        );
    }

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