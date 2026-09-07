# 新生产线强制门槛

## G0：启动门槛

必须完成：

1. 读取本交接包全部入口文件。
2. 确认 W08 为失败历史。
3. 确认当前没有用户审阅候选。
4. 核验参考原件文件名、大小与 SHA-256。
5. 使用新的 generation ID，保留原 Entity ID。
6. 激活 B24 优先级，关闭 B17 扩展。

通过条件：所有状态写入新线 `CURRENT.json`。

## G1：语义完整性门槛

必须建立主要外部语义部件对应表，至少包含：

1. receiver datum shell
2. top cover and plate layers
3. left side plate
4. right side plate
5. rear exterior group
6. barrel root and front collar
7. exposed barrel interval
8. ventilated jacket
9. forward termination
10. feed-side exterior opening
11. disposal-side exterior opening
12. sight base and sight candidate
13. exterior controls
14. fastener families
15. B24 installation interface placeholder

每项必须有稳定 part ID、当前证据、真值等级、参考对应、Native 状态和缺失原因。

通过条件：任何 required 部件缺失时，整枪完成状态自动失败。

## G2：机械注册门槛

参考体和生成体必须共用：

1. 纵向主轴
2. 枪管中心轴
3. 枪口端面
4. 机匣前端面
5. 机匣后端面
6. 机匣顶面
7. 至少一个侧板基准面

禁止依据整个包围盒长度和中心完成最终注册。

通过条件：每个基准的方向、位置、来源、置信度和残差均可查看。

## G3：分区测量门槛

每个语义区域单独测量，不计算一个可以掩盖局部错误的整枪总分。

最低测量集合：

1. 关键锚点位置误差
2. 截面中心偏移
3. 截面面积
4. 截面周长
5. 轮廓环数量
6. 孔洞数量
7. 二维轮廓距离
8. 正侧、反侧、俯视和端视轮廓重合率
9. 三维表面距离分布
10. required 部件完整率

通过条件：每个语义区域都有独立阈值、结果和红色失败状态。

## G4：第一几何区域门槛

第一阶段只重建：

`receiver datum shell + top cover/plate layering + barrel-root/front-collar transition`

执行顺序：

1. 机匣基准壳体
2. 顶盖和板层
3. 机匣前端面
4. 枪管中心轴
5. 枪管根部
6. 前环或前端连接结构
7. 过渡区局部紧固件与开口

通过条件：在相同中性材质和固定正交视角中，参考体与生成体肉眼明显收敛；数值门槛同时通过。

## G5：人工预检门槛

发布前必须由执行者实际载入原件并检查：

1. 正侧
2. 反侧
3. 俯视
4. 后视
5. 轴向
6. 机匣近景
7. 枪管根部近景
8. 护套近景
9. 边缘轮廓模式
10. 有符号距离或差异热图

必须保存预检记录。用户不能成为第一位真实参考载入后的检查者。

## G6：材质门槛

几何审查阶段使用同一中性材质。PBR 只能在形态门槛通过后接入。

材质接入后必须单独检查：

1. Surface Coordinates 稳定性
2. 材质尺度
3. 通道语义
4. 年代与维护证据
5. 近景闪烁与远景抗混叠
6. 几何轮廓不受微起伏改变
7. 不用污垢、油膜和强反射掩盖结构差异

## G7：B24 世界合同门槛

枪本体通过后，再与 World Kernel 交换：

1. B24 型号与批次
2. 具体枪位
3. 服役时间
4. 飞机局部坐标
5. 安装接口
6. 弹药箱与弹链路径
7. 支架或悬吊关系
8. 弹壳与链节处理关系
9. 环境、维护和事件历史

通过条件：具体适用性有实际资料支持；未知项保持 unknown。

## G8：用户交付门槛

只有 G1 至当前阶段全部通过后，才能生成用户链接。

交付物：

1. 单文件自包含 HTML
2. 固定 commit
3. raw.githack 直开链接
4. SHA-256 与字节数
5. 当前完成项与缺失项
6. 实际参考载入预检结果
7. `visualAcceptance=false`
8. `productionReady=false`

用户明确批准后，相关状态才允许改变。
