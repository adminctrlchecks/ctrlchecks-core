import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    jsonFieldParseError,
    resolveFieldControlKind,
    resolveFieldControlValue,
    resolveFieldValueKey,
    resolveFieldValueTarget,
} from '@/lib/wizard-field-ownership';
import type { FieldOwnershipContext, OwnershipQuestion } from './types';

/**
 * The editable control for a field, rendered inline on the field-ownership step.
 *
 * Mirrors the configuration step's control branching exactly — select / textarea /
 * number / password / text — so deleting that step in Phase 5 loses no capability.
 *
 * ⚠️ Every write goes through `writeValue` below, which is the ONLY place the storage
 * key and target map are decided. Plan §6a-2: writing under a different key scheme
 * type-checks and looks right, but saves the workflow with none of the user's values.
 */
export interface FieldValueControlProps {
    question: OwnershipQuestion;
    ctx: FieldOwnershipContext;
    disabled?: boolean;
}

export function FieldValueControl({ question, ctx, disabled }: FieldValueControlProps) {
    const kind = resolveFieldControlKind(question);
    const value = resolveFieldControlValue(question, ctx.inputValues ?? {}, ctx.credentialValues ?? {});
    const [touched, setTouched] = useState(false);
    const parseError = touched ? jsonFieldParseError(question, value) : null;

    /** The single write path. Key format and target map are decided here and nowhere else. */
    function writeValue(next: string) {
        if (disabled) return;
        const key = resolveFieldValueKey(question);
        if (!key) return;
        if (resolveFieldValueTarget(question) === 'credential') {
            ctx.setCredentialValues((prev) => ({ ...prev, [key]: next }));
        } else {
            ctx.setInputValues((prev) => ({ ...prev, [key]: next }));
        }
    }

    const placeholder =
        question.placeholder || question.description || `Enter ${question.fieldName}`;
    const controlId = `fo-field-${resolveFieldValueKey(question) || question.fieldName}`;

    if (kind === 'select') {
        const options = (question.options ?? []) as Array<string | { value: string; label?: string }>;
        return (
            <Select value={value} onValueChange={writeValue} disabled={disabled}>
                <SelectTrigger id={controlId} className="w-full">
                    <SelectValue placeholder={question.placeholder || `Select ${question.fieldName}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.length > 0 ? (
                        options.map((option, idx) => {
                            const optionValue = typeof option === 'string' ? option : option.value;
                            const optionLabel =
                                typeof option === 'string' ? option : option.label || option.value;
                            // Radix Select forbids empty-string item values.
                            if (String(optionValue ?? '').trim().length === 0) return null;
                            return (
                                <SelectItem key={idx} value={String(optionValue)}>
                                    {optionLabel}
                                </SelectItem>
                            );
                        })
                    ) : (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                            No options available
                        </div>
                    )}
                </SelectContent>
            </Select>
        );
    }

    if (kind === 'textarea') {
        return (
            <div className="space-y-1">
                <Textarea
                    id={controlId}
                    placeholder={placeholder}
                    className="w-full font-mono text-sm min-h-[120px]"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => writeValue(e.target.value)}
                    // JSON is validated on blur: there is no submit step to validate on
                    // any more, and validating per keystroke flags every partial object.
                    onBlur={() => setTouched(true)}
                />
                {parseError && <p className="text-[11px] text-amber-500">{parseError}</p>}
            </div>
        );
    }

    return (
        <Input
            id={controlId}
            type={kind === 'number' ? 'number' : kind === 'password' ? 'password' : 'text'}
            placeholder={placeholder}
            className="w-full"
            value={value}
            disabled={disabled}
            onChange={(e) => writeValue(e.target.value)}
        />
    );
}
