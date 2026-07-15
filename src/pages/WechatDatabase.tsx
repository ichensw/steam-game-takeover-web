import { DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Menu, Space, Table, Tooltip, Typography, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { getWechatTable, listWechatTableRows, listWechatTables, type Pagination, type WechatTable, type WechatTableColumn } from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { pageSizeOptions } from '../utils/pagination';
import { formatCell, previewText } from '../utils/wechatBot';

const schemaColumns: ColumnsType<WechatTableColumn> = [
  { title: '字段', dataIndex: 'name', width: 180, className: 'mono' },
  { title: '类型', dataIndex: 'type', width: 180, className: 'mono' },
  { title: '可空', dataIndex: 'nullable', width: 80, render: (value) => (value ? '是' : '否') },
  { title: '键', dataIndex: 'key', width: 90, className: 'mono', render: (value) => value || '-' },
  { title: '默认值', dataIndex: 'default', width: 140, className: 'mono', render: (value) => formatCell(value) || '-' },
  { title: '说明', dataIndex: 'comment', render: (value) => value || '-' },
];

export default function WechatDatabase() {
  const [tables, setTables] = useState<WechatTable[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [schema, setSchema] = useState<WechatTableColumn[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, totalItems: 0, totalPages: 0 });
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { message } = AntApp.useApp();

  const loadRows = async (table: string, page = 1, pageSize = pagination.pageSize) => {
    const result = await listWechatTableRows(table, { page, pageSize });
    setRows(result.data || []);
    setPagination(result.pagination || { page, pageSize, totalItems: 0, totalPages: 0 });
  };

  const selectTable = async (table: string) => {
    setSelectedTable(table);
    setLoadingDetail(true);
    try {
      const [detail] = await Promise.all([getWechatTable(table), loadRows(table, 1)]);
      setSchema(detail.columns || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '数据表加载失败');
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadTables = async () => {
    setLoadingTables(true);
    try {
      const result = await listWechatTables();
      setTables(result || []);
      const next = result?.find((table) => table.name === selectedTable)?.name || result?.[0]?.name;
      if (next) await selectTable(next);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '数据库列表加载失败');
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    void loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowColumns = useMemo<ColumnsType<Record<string, unknown>>>(() => {
    const names = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((name) => names.add(name)));
    return [...names].map((name) => ({
      title: name,
      dataIndex: name,
      className: 'mono',
      width: 220,
      render: (value: unknown) => {
        const text = formatCell(value);
        return <Tooltip title={text}><Typography.Text ellipsis>{previewText(text, 120) || '-'}</Typography.Text></Tooltip>;
      },
    }));
  }, [rows]);

  const selected = tables.find((table) => table.name === selectedTable);

  return (
    <>
      <PageHeader
        title="微信Bot数据库"
        description="查看机器人数据库中的表结构与只读分页数据。"
        extra={<Button icon={<ReloadOutlined />} loading={loadingTables} onClick={loadTables}>刷新</Button>}
      />
      <div className="wechat-database-layout">
        <Card title="数据表" className="wechat-table-list" loading={loadingTables}>
          {tables.length ? (
            <Menu
              mode="inline"
              selectedKeys={selectedTable ? [selectedTable] : []}
              onClick={({ key }) => void selectTable(String(key))}
              items={tables.map((table) => ({
                key: table.name,
                icon: <DatabaseOutlined />,
                label: <Space size={6}><span>{table.name}</span><Typography.Text type="secondary">{table.approxRows}</Typography.Text></Space>,
              }))}
            />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有可查看的数据表" />}
        </Card>
        <div className="wechat-database-detail">
          <Card title={selected?.comment || selectedTable || '表结构'} extra={selected?.engine ? <Typography.Text type="secondary">{selected.engine}</Typography.Text> : null}>
            <Table rowKey={(row) => String(row.name)} size="small" loading={loadingDetail} columns={schemaColumns} dataSource={schema} pagination={false} scroll={{ x: 900 }} />
          </Card>
          <Table
            rowKey={(row) => String(row.id ?? row.msg_id ?? JSON.stringify(row))}
            loading={loadingDetail}
            columns={rowColumns}
            dataSource={rows}
            scroll={{ x: Math.max(900, rowColumns.length * 220) }}
            locale={{ emptyText: selectedTable ? '当前表没有数据' : '请选择数据表' }}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.totalItems,
              pageSizeOptions,
              showSizeChanger: true,
              onChange: (page, pageSize) => selectedTable && void loadRows(selectedTable, page, pageSize),
              showTotal: (count) => `共 ${count} 条`,
            }}
          />
        </div>
      </div>
    </>
  );
}
