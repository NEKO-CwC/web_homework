"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useActionState,
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
  children?: ReactNode;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}>;

function firstFieldError(error?: string | string[]) {
  return Array.isArray(error) ? error[0] : error;
}

function enhanceFields(node: ReactNode, fieldErrors: ActionState["fieldErrors"]): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    const element = child as FieldElement;
    const name = element.props.name;
    const fieldError = name ? firstFieldError(fieldErrors?.[name]) : undefined;
    const existingChildren = element.props.children;
    const nextChildren = existingChildren
      ? enhanceFields(existingChildren, fieldErrors)
      : existingChildren;

    if (!fieldError) {
      return nextChildren === existingChildren ? child : cloneElement(element, undefined, nextChildren);
    }

    const errorId = `${element.props.id ?? name}-error`;
    const describedBy = [element.props["aria-describedby"], errorId].filter(Boolean).join(" ");

    return (
      <>
        {cloneElement(element, {
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

export function ActionForm({
  action,
  children,
  submitLabel,
  variant = "primary",
  className = "form"
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formChildren = state.fieldErrors ? enhanceFields(children, state.fieldErrors) : children;

  return (
    <form className={className} action={formAction}>
      {formChildren}
      {state.message ? (
        <div
          className={`form-feedback ${state.ok ? "success" : "danger"}`}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </div>
      ) : null}
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "处理中..." : submitLabel}
      </Button>
    </form>
  );
}
