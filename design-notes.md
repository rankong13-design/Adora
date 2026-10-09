# 当前视觉更新

按最新参考改为暖杏色圆日、雾灰天空与暖褐地平线图标；全站背景改为纯 CSS 渐变，不再加载海岸图片。以下为上一版设计记录。

# Adora · 海岸暮色视觉

本次依据用户提供的潮汐手机截图，重新设计 Adora 的视觉界面。保留广告创意助手的 Mock 流程与数据结构。

- 首页：暮色海岸、宽松留白、半透明示例卡片、圆形细线图标入口。
- 图标：暖白圆角底，杏色至珊瑚色的日出弧线与一条涟漪。
- 字体与颜色：暖白主文字、米杏次要文字、暖灰表单底色、浅珊瑚主按钮。
- 手机：固定的首页、创作、项目底部导航；表单与结果页为单列。
- 桌面：半透明侧栏；内容区保留更宽的自然背景和创作空间。
- 项目封面：按市场切换色调的抽象日出装饰，不代表商品实拍。

## 素材

海岸背景使用内置 image_gen 工具生成，仅在设计阶段执行；产品本身仍不调用模型 API。

背景保存路径：`C:/Users/Lenovo/.codex/.chatgpt-projects/g-p-6ab218bbe0848191a03c9440ee1e6e12/adpilot/public/images/adora-coast.png`

矢量品牌图标路径：`C:/Users/Lenovo/.codex/.chatgpt-projects/g-p-6ab218bbe0848191a03c9440ee1e6e12/adpilot/app/icon.svg`

背景生成提示词（原文）：

> Use case: photorealistic-natural. Asset type: full-screen background photograph for Adora, a calm creative workspace inspired by quiet coastal meditation app aesthetics. Create one high-quality landscape 1536x1024 photograph: empty tranquil ocean shore at dusk, a straight distant horizon at 48% of image height, soft long low foamy waves in the foreground, pale dusty slate blue sky fading into warm muted apricot and taupe at horizon, warm grey sand, subtle natural film grain. Understated, atmospheric, premium editorial landscape photography, low contrast, very desaturated, soft ambient twilight. Spacious clean sky to hold interface text. No dramatic sunset, no clouds with sharp edges, no rocks, no people, no buildings, no boats. No text, no letters, no logos, no UI. This is an original background asset, not a screenshot.

## 本次验证

- Next.js 生产构建、构建内 TypeScript 检查通过。
- 390px 手机预览检查：首页、输入页、结果页、历史页。
- 1280px 桌面预览检查：首页侧栏与主布局。
- 手机表单创建示例项目并生成三套创意成功。
- 检查的手机首页、输入页、结果页未发现横向溢出；检查时浏览器错误日志为空。
