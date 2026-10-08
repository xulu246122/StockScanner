import { ConditionGroup, ConditionNode, Timeframe } from '../../types.ts';
import { getFilterDefinition } from './filterRegistry.ts';

export interface FilterValidationIssue {
  path: string;
  code: 'UNKNOWN_FILTER' | 'UNSUPPORTED_OPERATOR' | 'UNSUPPORTED_TIMEFRAME' | 'INVALID_VALUE' | 'MISSING_VALUE';
  message: string;
}

function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateLeaf(node: ConditionNode, path: string): FilterValidationIssue[] {
  const issues: FilterValidationIssue[] = [];
  const definition = getFilterDefinition(node.indicatorId);

  if (!definition) {
    issues.push({ path, code: 'UNKNOWN_FILTER', message: `Filter '${node.indicatorId}' is not registered.` });
    return issues;
  }

  if (!definition.operators.includes(node.operator)) {
    issues.push({ path, code: 'UNSUPPORTED_OPERATOR', message: `${node.operator} is not supported by ${node.indicatorId}.` });
  }

  if (node.timeframe && !definition.supportedTimeframes.includes(node.timeframe)) {
    issues.push({ path, code: 'UNSUPPORTED_TIMEFRAME', message: `${node.indicatorId} does not support timeframe ${node.timeframe}.` });
  }

  if (node.value === undefined || node.value === null || node.value === '') {
    issues.push({ path, code: 'MISSING_VALUE', message: `${node.indicatorId} requires a comparison value.` });
    return issues;
  }

  if (definition.valueType === 'number') {
    const between = Array.isArray(node.value) && node.value.length === 2
      ? node.value
      : typeof node.value === 'object' && node.value !== null
        ? [node.value.min, node.value.max]
        : null;
    const values = between || [node.value];
    if (!values.every(isNumeric)) {
      issues.push({ path, code: 'INVALID_VALUE', message: `${node.indicatorId} requires numeric values.` });
    } else {
      for (const value of values) {
        if (definition.min !== undefined && value < definition.min) {
          issues.push({ path, code: 'INVALID_VALUE', message: `${node.indicatorId} cannot be less than ${definition.min}.` });
        }
        if (definition.max !== undefined && value > definition.max) {
          issues.push({ path, code: 'INVALID_VALUE', message: `${node.indicatorId} cannot be greater than ${definition.max}.` });
        }
      }
      if (between && between[0] > between[1]) {
        issues.push({ path, code: 'INVALID_VALUE', message: `${node.indicatorId} range minimum cannot exceed maximum.` });
      }
    }
  }

  if (definition.valueType === 'boolean' && typeof node.value !== 'boolean') {
    issues.push({ path, code: 'INVALID_VALUE', message: `${node.indicatorId} requires a boolean value.` });
  }

  return issues;
}

export function validateFilterGroup(group: ConditionGroup, path = 'root'): FilterValidationIssue[] {
  if (!group || group.type !== 'group' || !Array.isArray(group.children)) {
    return [{ path, code: 'INVALID_VALUE', message: 'A valid condition group is required.' }];
  }

  const issues: FilterValidationIssue[] = [];
  group.children.forEach((child, index) => {
    const childPath = `${path}.children[${index}]`;
    if (child.type === 'leaf') {
      issues.push(...validateLeaf(child, childPath));
    } else {
      issues.push(...validateFilterGroup(child, childPath));
    }
  });
  return issues;
}

export function getDefaultTimeframe(node: ConditionNode): Timeframe {
  return node.timeframe || '1D';
}
