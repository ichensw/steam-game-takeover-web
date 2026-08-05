import { Modal, Spin } from 'antd';
import type { ModalProps } from 'antd';
import type { ReactNode } from 'react';

type ModalPanelProps = {
  children: ReactNode;
  className?: string;
  extra?: ReactNode;
  footer?: ModalProps['footer'];
  keyboard?: boolean;
  loading?: boolean;
  maskClosable?: boolean;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
  width?: ModalProps['width'];
};

export default function ModalPanel({
  children,
  className,
  extra,
  footer,
  keyboard,
  loading,
  maskClosable,
  onClose,
  open,
  title,
  width,
}: ModalPanelProps) {
  return (
    <Modal
      className={className}
      footer={footer}
      keyboard={keyboard}
      maskClosable={maskClosable}
      onCancel={onClose}
      open={open}
      title={extra ? <div className="modal-panel-title"><span>{title}</span>{extra}</div> : title}
      width={width}
    >
      <Spin spinning={loading}>{children}</Spin>
    </Modal>
  );
}
