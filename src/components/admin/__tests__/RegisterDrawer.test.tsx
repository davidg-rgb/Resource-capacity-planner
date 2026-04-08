/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 43 / Plan 43-02 — Task 2 (TDD)
 * RegisterDrawer: renders formComponent with defaultValues, forwards
 * isArchived/submitting/submitError, close button fires onClose.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegisterDrawer, type RegisterDrawerFormProps } from '../RegisterDrawer';

type Values = { name: string };

function StubForm(props: RegisterDrawerFormProps<Values>) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit({ name: 'Kontor' });
      }}
    >
      <div data-testid="stub-default-name">{props.defaultValues?.name ?? 'empty'}</div>
      <div data-testid="stub-archived">{String(props.isArchived)}</div>
      <div data-testid="stub-submitting">{String(props.submitting)}</div>
      <div data-testid="stub-error">{props.submitError ?? ''}</div>
      <button type="button" onClick={props.onCancel} data-testid="stub-cancel">
        Avbryt
      </button>
      <button type="submit" data-testid="stub-submit">
        Spara
      </button>
    </form>
  );
}

describe('RegisterDrawer', () => {
  it('does not render when open=false', () => {
    render(
      <RegisterDrawer<Values>
        open={false}
        onClose={vi.fn()}
        title="Ny avdelning"
        formComponent={StubForm}
        defaultValues={null}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('register-drawer-body')).not.toBeInTheDocument();
  });

  it('renders the formComponent with defaultValues when open', () => {
    render(
      <RegisterDrawer<Values>
        open
        onClose={vi.fn()}
        title="Redigera avdelning"
        formComponent={StubForm}
        defaultValues={{ name: 'Mekanik' }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId('register-drawer-body')).toBeInTheDocument();
    expect(screen.getByTestId('stub-default-name')).toHaveTextContent('Mekanik');
  });

  it('forwards isArchived, submitting, submitError to the form', () => {
    render(
      <RegisterDrawer<Values>
        open
        onClose={vi.fn()}
        title="Arkiverad"
        formComponent={StubForm}
        defaultValues={{ name: 'El' }}
        onSubmit={vi.fn()}
        isArchived
        submitting
        submitError="Kunde inte spara"
      />,
    );
    expect(screen.getByTestId('stub-archived')).toHaveTextContent('true');
    expect(screen.getByTestId('stub-submitting')).toHaveTextContent('true');
    expect(screen.getByTestId('stub-error')).toHaveTextContent('Kunde inte spara');
  });

  it('close button fires onClose', async () => {
    const onClose = vi.fn();
    render(
      <RegisterDrawer<Values>
        open
        onClose={onClose}
        title="Ny"
        formComponent={StubForm}
        defaultValues={null}
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByTestId('drawer-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('form cancel (onCancel) fires onClose via passed prop', async () => {
    const onClose = vi.fn();
    render(
      <RegisterDrawer<Values>
        open
        onClose={onClose}
        title="Ny"
        formComponent={StubForm}
        defaultValues={null}
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByTestId('stub-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('form submit calls passed onSubmit with values', async () => {
    const onSubmit = vi.fn();
    render(
      <RegisterDrawer<Values>
        open
        onClose={vi.fn()}
        title="Ny"
        formComponent={StubForm}
        defaultValues={null}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByTestId('stub-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Kontor' });
  });
});
