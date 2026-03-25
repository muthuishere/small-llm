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
    <div className="px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3 px-1">
          JSON Schema
        </p>
        <Textarea
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          rows={6}
          className="font-mono text-sm"
          placeholder='{ "type": "object", ... }'
        />
        {schemaError && <p className="text-[var(--destructive)] text-sm mt-2">{schemaError}</p>}
        <Button size="sm" className="mt-3 w-full" variant="secondary" onClick={applySchema}>
          Apply Schema
        </Button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3 px-1">
          Few-shot Examples
        </p>
        <Textarea
          value={examplesText}
          onChange={(e) => setExamplesText(e.target.value)}
          rows={4}
          className="font-mono text-sm"
          placeholder='[{"input": "...", "output": {...}}]'
        />
        {examplesError && <p className="text-[var(--destructive)] text-sm mt-2">{examplesError}</p>}
        <Button size="sm" className="mt-3 w-full" variant="secondary" onClick={applyExamples}>
          Apply Examples
        </Button>
      </div>
    </div>
  );
}
