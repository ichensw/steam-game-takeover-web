import { Flex, Typography } from 'antd';

type Props = {
  title: string;
  description: string;
  extra?: React.ReactNode;
};

export default function PageHeader({ title, description, extra }: Props) {
  return (
    <Flex align="flex-start" justify="space-between" gap={20} className="page-header">
      <div className="page-header-copy">
        <Typography.Title level={2}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      {extra ? <div className="page-header-actions">{extra}</div> : null}
    </Flex>
  );
}

