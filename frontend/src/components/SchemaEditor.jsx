import { useState } from 'react';
import useChatStore from '../store/chatStore';
import { Textarea } from './ui/Input';
import { Button } from './ui/Button';

export function SchemaEditor() {
  const { schema, setSchema, fewShotExamples, setFewShotExamples } = useChatStore();
  const [schemaText, setSchemaText] = useState(JSON.stringify(schema, null, 2));
  const [examplesText, setExamplesText] = useState(JSON.stringify(fewShotExamples, null, 2));
  const [schemaError, setSchemaError] = useState('');
  const [examplesError, setExamplesError] = useState('');

  const applySchema = () => {
    try {
      setSchema(JSON.parse(schemaText));
      setSchemaError('');
    } catch {
      setSchemaError('Invalid JSON');
    }
  };

  const applyExamples = () => {
    try {
      setFewShotExamples(JSON.parse(examplesText));
      setExamplesError('');
    } catch {
      setExamplesError('Invalid JSON');
    }
  };

  return (
    <div className="p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-1">
        JSON Schema
      </p>
      <div>
        <Textarea
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          rows={6}
          className="font-mono text-xs"
          placeholder='{ "type": "object", ... }'
        />
        {schemaError && <p className="text-red-400 text-xs mt-1">{schemaError}</p>}
        <Button size="sm" className="mt-1.5 w-full" variant="secondary" onClick={applySchema}>
          Apply Schema
        </Button>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-1 mt-3">
        Few-shot Examples
      </p>
      <div>
        <Textarea
          value={examplesText}
          onChange={(e) => setExamplesText(e.target.value)}
          rows={4}
          className="font-mono text-xs"
          placeholder='[{"input": "...", "output": {...}}]'
        />
        {examplesError && <p className="text-red-400 text-xs mt-1">{examplesError}</p>}
        <Button size="sm" className="mt-1.5 w-full" variant="secondary" onClick={applyExamples}>
          Apply Examples
        </Button>
      </div>
    </div>
  );
}
