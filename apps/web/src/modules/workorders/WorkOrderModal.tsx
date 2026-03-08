import { Modal, Button } from '../../shared/components';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WorkOrderModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Novy Work Order" wide footer={
      <>
        <Button onClick={onClose}>Zrusit</Button>
        <Button variant="primary">Ulozit</Button>
      </>
    }>
      <p className="text-muted">Formular bude doplnen.</p>
    </Modal>
  );
}
