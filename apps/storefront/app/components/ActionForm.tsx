"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useActionState,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode
} from "react";
import { Button } from "@minimal-mall/ui";
import type { ActionState } from "@/lib/actions";

const initialState: ActionState = {
  ok: false,
  message: ""
};

type FieldElement = ReactElement<{
  name?: string;
  id?: string;
  defaultValue?: string | number | readonly string[];
  type?: string;
  children?: ReactNode;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}>;

function firstFieldError(error?: string | string[]) {
  return Array.isArray(error) ? error[0] : error;
}

function enhanceFields(
  node: ReactNode,
  fieldErrors: ActionState["fieldErrors"],
  currentValues: Record<string, string> = {}
): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    const element = child as FieldElement;
    const name = element.props.name;
    const fieldError = name ? firstFieldError(fieldErrors?.[name]) : undefined;
    const existingChildren = element.props.children;
    const nextChildren = existingChildren
      ? enhanceFields(existingChildren, fieldErrors, currentValues)
      : existingChildren;

    if (!fieldError) {
      return nextChildren === existingChildren ? child : cloneElement(element, undefined, nextChildren);
    }

    const errorId = `${element.props.id ?? name}-error`;
    const describedBy = [element.props["aria-describedby"], errorId].filter(Boolean).join(" ");
    const preservedValueProps = name && element.props.type !== "file" && currentValues[name] !== undefined
      ? { defaultValue: currentValues[name] }
      : {};

    return (
      <>
        {cloneElement(element, {
          ...preservedValueProps,
          "aria-invalid": true,
          "aria-describedby": describedBy || undefined
        })}
        <span id={errorId} className="field-error" role="alert">
          {fieldError}
        </span>
      </>
    );
  });
}

type ValidatableControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isValidatableControl(element: Element): element is ValidatableControl {
  return (
    (element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement) &&
    Boolean(element.name) &&
    element.willValidate
  );
}

function messageForControl(control: ValidatableControl) {
  const { validity, dataset } = control;
  if (validity.valueMissing) return dataset.requiredMessage ?? "请填写必填字段";
  if (validity.tooShort) return dataset.minLengthMessage ?? `至少输入 ${control.getAttribute("minlength")} 个字符`;
  if (validity.rangeUnderflow) return dataset.minMessage ?? `数值不能小于 ${control.getAttribute("min")}`;
  if (validity.rangeOverflow) return dataset.maxMessage ?? `数值不能大于 ${control.getAttribute("max")}`;
  if (validity.typeMismatch) return dataset.typeMessage ?? "请输入有效格式";
  if (validity.badInput || validity.stepMismatch) return dataset.numberMessage ?? "请输入有效数值";
  return dataset.validationMessage ?? "输入内容不符合要求";
}

function collectClientFieldErrors(form: HTMLFormElement) {
  const fieldErrors: Record<string, string> = {};
  for (const element of Array.from(form.elements)) {
    if (!isValidatableControl(element) || element.validity.valid) continue;
    fieldErrors[element.name] ??= messageForControl(element);
  }
  return fieldErrors;
}

function collectFormValues(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(form).entries()) {
    if (typeof value === "string") values[name] = value;
  }
  return values;
}

export function ActionForm({
  action,
  children,
  submitLabel,
  variant = "primary",
  className = "form",
  validationMessage = "表单校验失败"
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  validationMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [clientState, setClientState] = useState<ActionState | null>(null);
  const displayState = clientState ?? state;
  const formChildren = displayState.fieldErrors
    ? enhanceFields(children, displayState.fieldErrors, displayState.payload)
    : children;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const fieldErrors = collectClientFieldErrors(event.currentTarget);
    if (Object.keys(fieldErrors).length === 0) {
      setClientState(null);
      return;
    }
    event.preventDefault();
    setClientState({
      ok: false,
      message: validationMessage,
      fieldErrors,
      payload: collectFormValues(event.currentTarget)
    });
  }

  return (
    <form
      className={className}
      action={formAction}
      noValidate
      onSubmit={handleSubmit}
    >
      {formChildren}
      {displayState.message ? (
        <div
          className={`form-feedback ${displayState.ok ? "success" : "danger"}`}
          role="status"
          aria-live="polite"
        >
          {displayState.message}
        </div>
      ) : null}
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "处理中..." : submitLabel}
      </Button>
    </form>
  );
}
