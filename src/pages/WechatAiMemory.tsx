import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ReloadOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import {
  createWechatAiJob,
  getWechatAiRoomPersona,
  getWechatAiStatus,
  listWechatAiErrors,
  listWechatAiJobs,
  listWechatAiMemoryRuns,
  listWechatAiPersonaCandidates,
  listWechatAiProfiles,
  promoteWechatAiPersonaCandidate,
  rejectWechatAiPersonaCandidate,
  resolveWechatAiError,
  retryWechatAiError,
  type WechatAiError,
  type WechatAiJob,
  type WechatAiMemoryRun,
  type WechatAiPersona,
  type WechatAiPersonaCandidate,
  type WechatAiProfile,
  type WechatAiStatus,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { formatWechatTime } from '../utils/wechatBot';

type ManualJobType = 'segment_summary' | 'profile_merge' | 'culture_update' | 'persona_candidate';
type ManualFormValues = {
  roomId: string;
  jobType: ManualJobType;
  start?: string;
  end?: string;
  model?: string;
  reason?: string;
};

const jobTypeLabel: Record<WechatAiJob['jobType'], string> = {
  reply: '实时回复',
  segment_summary: '分段总结',
  profile_merge: '画像合并',
  culture_update: '群文化更新',
  persona_candidate: '人格候选',
};

const jobStatusColor: Record<WechatAiJob['status'], string> = {
  queued: 'gold',
  running: 'processing',
  succeeded: 'success',
  failed: 'error',
};

const jobStatusLabel: Record<WechatAiJob['status'], string> = {
  queued: '排队中',
  running: '执行中',
  succeeded: '成功',
  failed: '失败',
};

const jsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const summaryText = (run?: WechatAiMemoryRun) => {
  const value = run?.resultJson?.summary;
  return typeof value === 'string' ? value : '-';
};

export default function WechatAiMemory() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number>();
  const [status, setStatus] = useState<WechatAiStatus>();
  const [jobs, setJobs] = useState<WechatAiJob[]>([]);
  const [errors, setErrors] = useState<WechatAiError[]>([]);
  const [runs, setRuns] = useState<WechatAiMemoryRun[]>([]);
  const [profiles, setProfiles] = useState<WechatAiProfile[]>([]);
  const [persona, setPersona] = useState<WechatAiPersona>();
  const [candidates, setCandidates] = useState<WechatAiPersonaCandidate[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [jsonModal, setJsonModal] = useState<{ title: string; value: unknown }>();
  const [manualForm] = Form.useForm<ManualFormValues>();
  const manualJobType = Form.useWatch('jobType', manualForm);

  const roomOptions = (status?.rooms || []).map((room) => ({ label: room.roomId, value: room.roomId }));
  const modelOptions = Array.from(new Set([
    status?.models.summary,
    status?.models.merge,
    status?.models.manualDeep,
  ].filter(Boolean))).map((model) => ({ label: model, value: model }));

  const loadOverview = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [nextStatus, nextJobs, nextErrors] = await Promise.all([
        getWechatAiStatus(),
        listWechatAiJobs({ limit: 100 }),
        listWechatAiErrors({ limit: 100 }),
      ]);
      setStatus(nextStatus);
      setJobs(nextJobs.items || []);
      setErrors(nextErrors.items || []);
      setSelectedRoomId((current) => (
        current && nextStatus.rooms.some((room) => room.roomId === current)
          ? current
          : nextStatus.rooms[0]?.roomId || ''
      ));
    } catch (error) {
      if (!quiet) message.error(error instanceof Error ? error.message : 'AI 状态加载失败');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const loadMemory = async (roomId: string) => {
    if (!roomId) {
      setRuns([]);
      setProfiles([]);
      setPersona(undefined);
      setCandidates([]);
      return;
    }
    setMemoryLoading(true);
    try {
      const [nextRuns, nextProfiles, nextPersona, nextCandidates] = await Promise.all([
        listWechatAiMemoryRuns({ roomId, limit: 100 }),
        listWechatAiProfiles(roomId),
        getWechatAiRoomPersona(roomId),
        listWechatAiPersonaCandidates({ roomId, limit: 100 }),
      ]);
      setRuns(nextRuns.items || []);
      setProfiles(nextProfiles.items || []);
      setPersona('items' in nextPersona ? undefined : nextPersona);
      setCandidates(nextCandidates.items || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '记忆数据加载失败');
    } finally {
      setMemoryLoading(false);
    }
  };

  const refresh = async () => {
    await loadOverview();
    await loadMemory(selectedRoomId);
  };

  const createJob = async () => {
    const values = await manualForm.validateFields();
    try {
      await createWechatAiJob({
        roomId: values.roomId,
        jobType: values.jobType,
        start: values.start || undefined,
        end: values.end || undefined,
        model: values.model || undefined,
        reason: values.reason || undefined,
      });
      message.success('任务已提交');
      await loadOverview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务提交失败');
    }
  };

  const retryError = async (errorId: number) => {
    setActionLoading(errorId);
    try {
      await retryWechatAiError(errorId);
      message.success('重试任务已提交');
      await loadOverview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重试失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  const resolveError = async (errorId: number) => {
    setActionLoading(errorId);
    try {
      await resolveWechatAiError(errorId);
      message.success('失败记录已解决');
      await loadOverview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  const reviewCandidate = async (candidateId: number, action: 'promote' | 'reject') => {
    setActionLoading(candidateId);
    try {
      if (action === 'promote') {
        await promoteWechatAiPersonaCandidate(candidateId);
        message.success('人格候选已晋升');
      } else {
        await rejectWechatAiPersonaCandidate(candidateId);
        message.success('人格候选已拒绝');
      }
      await loadMemory(selectedRoomId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  useEffect(() => {
    void loadOverview();
    const timer = window.setInterval(() => void loadOverview(true), 12000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadMemory(selectedRoomId);
    manualForm.setFieldValue('roomId', selectedRoomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  const jobsColumns: ColumnsType<WechatAiJob> = [
    { title: '任务', dataIndex: 'id', width: 82, render: (value) => `#${value}` },
    { title: '群聊', dataIndex: 'roomId', ellipsis: true },
    { title: '类型', dataIndex: 'jobType', width: 112, render: (value: WechatAiJob['jobType']) => jobTypeLabel[value] },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: WechatAiJob['status']) => <Tag color={jobStatusColor[value]}>{jobStatusLabel[value]}</Tag> },
    { title: '模型', dataIndex: 'model', width: 112, ellipsis: true },
    { title: '输入', dataIndex: 'inputMsgCount', width: 78, render: (value) => value || '-' },
    { title: '完成时间', dataIndex: 'finishedAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '结果',
      width: 76,
      render: (_, row) => row.resultJson ? (
        <Button type="text" icon={<EyeOutlined />} aria-label="查看任务结果" onClick={() => setJsonModal({ title: `任务 #${row.id}`, value: row.resultJson })} />
      ) : '-',
    },
  ];

  const errorsColumns: ColumnsType<WechatAiError> = [
    { title: '失败', dataIndex: 'id', width: 76, render: (value) => `#${value}` },
    { title: '群聊', dataIndex: 'roomId', ellipsis: true },
    { title: '类型', dataIndex: 'jobType', width: 112, render: (value: WechatAiJob['jobType']) => jobTypeLabel[value] },
    { title: '错误', dataIndex: 'errorMessage', ellipsis: true },
    { title: '耗时', dataIndex: 'elapsedMs', width: 94, render: (value) => `${value || 0} ms` },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '操作',
      width: 150,
      render: (_, row) => row.resolved ? <Tag>已解决</Tag> : (
        <Space size={0}>
          <Button type="text" icon={<RedoOutlined />} loading={actionLoading === row.id} aria-label="重试失败任务" onClick={() => void retryError(row.id)} />
          <Button type="text" icon={<CheckOutlined />} loading={actionLoading === row.id} aria-label="标记失败已解决" onClick={() => void resolveError(row.id)} />
          {row.requestMetaJson ? <Button type="text" icon={<EyeOutlined />} aria-label="查看失败元数据" onClick={() => setJsonModal({ title: `失败 #${row.id}`, value: row.requestMetaJson })} /> : null}
        </Space>
      ),
    },
  ];

  const runsColumns: ColumnsType<WechatAiMemoryRun> = [
    { title: '记忆', dataIndex: 'id', width: 82, render: (value) => `#${value}` },
    { title: '片段结束', dataIndex: 'windowEnd', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '消息数', dataIndex: 'inputMsgCount', width: 86 },
    { title: '摘要', render: (_, row) => <Typography.Text ellipsis={{ tooltip: summaryText(row) }}>{summaryText(row)}</Typography.Text> },
    { title: '详情', width: 72, render: (_, row) => <Button type="text" icon={<EyeOutlined />} aria-label="查看分段记忆" onClick={() => setJsonModal({ title: `记忆 #${row.id}`, value: row.resultJson })} /> },
  ];

  const profilesColumns: ColumnsType<WechatAiProfile> = [
    { title: '成员', dataIndex: 'displayName', render: (value, row) => value || row.memberWxid, ellipsis: true },
    { title: 'wxid', dataIndex: 'memberWxid', ellipsis: true },
    { title: '置信度', dataIndex: 'confidence', width: 90, render: (value) => Number(value || 0).toFixed(2) },
    { title: '证据', dataIndex: 'evidenceMsgIds', width: 76, render: (value) => Array.isArray(value) ? value.length : 0 },
    { title: '更新', dataIndex: 'updatedAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '详情', width: 72, render: (_, row) => <Button type="text" icon={<EyeOutlined />} aria-label="查看成员画像" onClick={() => setJsonModal({ title: row.displayName || row.memberWxid, value: row.profileJson })} /> },
  ];

  const candidatesColumns: ColumnsType<WechatAiPersonaCandidate> = [
    { title: '候选', dataIndex: 'id', width: 82, render: (value) => `#${value}` },
    { title: '状态', dataIndex: 'status', width: 100, render: (value) => <Tag color={value === 'pending' ? 'gold' : value === 'promoted' ? 'success' : 'default'}>{value === 'pending' ? '待审核' : value === 'promoted' ? '已晋升' : '已拒绝'}</Tag> },
    { title: '生成时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '内容', render: (_, row) => <Button type="text" icon={<EyeOutlined />} aria-label="查看人格候选" onClick={() => setJsonModal({ title: `人格候选 #${row.id}`, value: row.candidateJson })} /> },
    {
      title: '审核',
      width: 112,
      render: (_, row) => row.status !== 'pending' ? '-' : (
        <Space size={0}>
          <Button type="text" icon={<CheckOutlined />} loading={actionLoading === row.id} aria-label="晋升人格候选" onClick={() => void reviewCandidate(row.id, 'promote')} />
          <Button type="text" danger icon={<CloseOutlined />} loading={actionLoading === row.id} aria-label="拒绝人格候选" onClick={() => void reviewCandidate(row.id, 'reject')} />
        </Space>
      ),
    },
  ];

  const queuedJobs = jobs.filter((job) => job.status === 'queued').length;
  const runningJobs = jobs.filter((job) => job.status === 'running').length;
  const failedJobs = jobs.filter((job) => job.status === 'failed').length;

  return (
    <>
      <PageHeader title="AI 记忆" description="微信 Bot" extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()}>刷新</Button>} />
      <Tabs
        items={[
          {
            key: 'overview',
            label: '任务概览',
            children: (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                {!status?.configured ? <Alert type="warning" showIcon message="AI 尚未完成配置" /> : null}
                <Row gutter={[16, 16]}>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="排队" value={queuedJobs} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="执行中" value={runningJobs} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="失败" value={failedJobs} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="群聊" value={status?.rooms.length || 0} /></Card></Col>
                </Row>
                <Card title="最近任务" loading={loading}>
                  <Table rowKey="id" size="small" columns={jobsColumns} dataSource={jobs} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 960 }} />
                </Card>
              </Space>
            ),
          },
          {
            key: 'manual',
            label: '手动补偿',
            children: (
              <Card>
                <Form form={manualForm} layout="vertical" onFinish={() => void createJob()}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                      <Form.Item name="roomId" label="群聊" rules={[{ required: true, message: '请选择群聊' }]}>
                        <Select options={roomOptions} placeholder="选择群聊" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="jobType" label="任务类型" initialValue="segment_summary" rules={[{ required: true }]}>
                        <Select options={Object.entries(jobTypeLabel).filter(([value]) => value !== 'reply').map(([value, label]) => ({ value, label }))} />
                      </Form.Item>
                    </Col>
                    {manualJobType === 'segment_summary' ? (
                      <>
                        <Col xs={24} md={12}><Form.Item name="start" label="开始时间" rules={[{ required: true, message: '请选择开始时间' }]}><Input type="datetime-local" /></Form.Item></Col>
                        <Col xs={24} md={12}><Form.Item name="end" label="结束时间" rules={[{ required: true, message: '请选择结束时间' }]}><Input type="datetime-local" /></Form.Item></Col>
                      </>
                    ) : null}
                    <Col xs={24} md={12}><Form.Item name="model" label="模型"><Select allowClear options={modelOptions} placeholder="使用任务默认模型" /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="reason" label="原因"><Input maxLength={64} /></Form.Item></Col>
                  </Row>
                  <Button type="primary" htmlType="submit">提交任务</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'errors',
            label: '失败记录',
            children: (
              <Card loading={loading}>
                <Table rowKey="id" size="small" columns={errorsColumns} dataSource={errors} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 980 }} />
              </Card>
            ),
          },
          {
            key: 'memory',
            label: '记忆查看',
            children: (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                <Select value={selectedRoomId || undefined} options={roomOptions} placeholder="选择群聊" onChange={setSelectedRoomId} style={{ maxWidth: 420 }} />
                {selectedRoomId ? (
                  <Tabs
                    items={[
                      { key: 'runs', label: '分段记忆', children: <Table loading={memoryLoading} rowKey="id" size="small" columns={runsColumns} dataSource={runs} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 820 }} /> },
                      { key: 'profiles', label: '成员画像', children: <Table loading={memoryLoading} rowKey="memberWxid" size="small" columns={profilesColumns} dataSource={profiles} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 820 }} /> },
                      {
                        key: 'persona',
                        label: '群文化与人格',
                        children: (
                          <Row gutter={[16, 16]}>
                            <Col xs={24} lg={12}><Card size="small" title="群文化" extra={<Button type="text" icon={<EyeOutlined />} aria-label="查看群文化" onClick={() => setJsonModal({ title: '群文化', value: persona?.roomCultureJson })} />}><Typography.Paragraph ellipsis={{ rows: 8, expandable: true }}>{jsonText(persona?.roomCultureJson)}</Typography.Paragraph></Card></Col>
                            <Col xs={24} lg={12}><Card size="small" title="稳定人格" extra={<Button type="text" icon={<EyeOutlined />} aria-label="查看稳定人格" onClick={() => setJsonModal({ title: '稳定人格', value: persona?.botPersonaJson })} />}><Typography.Paragraph ellipsis={{ rows: 8, expandable: true }}>{jsonText(persona?.botPersonaJson)}</Typography.Paragraph></Card></Col>
                            <Col span={24}><Card size="small" title="人格候选"><Table loading={memoryLoading} rowKey="id" size="small" columns={candidatesColumns} dataSource={candidates} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 620 }} /></Card></Col>
                          </Row>
                        ),
                      },
                    ]}
                  />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </Space>
            ),
          },
        ]}
      />
      <Modal open={Boolean(jsonModal)} title={jsonModal?.title} footer={null} onCancel={() => setJsonModal(undefined)} width={760}>
        <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{jsonText(jsonModal?.value)}</Typography.Paragraph>
      </Modal>
    </>
  );
}
