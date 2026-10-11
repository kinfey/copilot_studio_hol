Workshop INTERNAL — training header
# AtlasGateway 2.1 运维手册

## AGW-401 证书轮换失败
适用范围：AtlasGateway 2.1；IT；2026；状态 Approved。
轮换后 AGW-401 表示信任链或绑定配置需要检查，不代表用户密码错误。
检查证书链和当前绑定版本；仅由授权运维人员修复配置。不关闭 TLS 校验，不索取私钥，不建议绕过认证。

检查项	说明
证书链	检查中间证书是否完整
绑定版本	核对当前服务证书指纹
升级条件	经批准修复后仍失败则创建内部事件工单

Page 1 of 2
Workshop INTERNAL — training header
## AGW-429 请求限流
适用范围同上。AGW-429 表示请求速率过高。
先查看重试间隔和流量；保持服务端限流策略，不把限流问题解释为证书错误。

Page 2 of 2
