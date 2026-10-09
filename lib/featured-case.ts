import type { Creative, ProductInput } from './types.ts';

export const featuredCaseId = 'anker-nano-a1653';
export const productSource = 'https://www.anker.com/products/a1653-usb-c-portable-charger-5000mah';
export const featuredInput: ProductInput = {
  name: 'Anker Nano A1653 · 精选案例', category: '数码电子', country: 'US', platform: 'TikTok', style: '真实种草',
  benefits: '5,000mAh；内置折叠式 USB-C 插头；约 100g（3.5 oz）；可直接连接兼容手机；不适配厚度超过 4.9mm 的手机壳；使用时同时托住手机和充电宝',
  audience: '美国大学生，使用兼容 USB-C 手机，经常在校园与校外活动（创意假设）',
};

const rationale = '美国 TikTok 创意练习：使用简短英文字幕，面向兼容 USB-C 手机的大学生。校园、叫车与随身携带是待验证的使用情境，并非美国独有习惯，也不是市场调研结论。未承诺广告转化效果。';
export function featuredCreatives(): Creative[] {
  return [
    {
      id: 'anker-cable', direction: '忘了带线', subtitle: '一个翻包动作，讲清产品差异',
      concept: '充电宝带了，连接线却没带。用一次翻包的落空，对比折叠插头直接展开的动作。',
      buyingReason: '外出补电时，少惦记一根连接兼容手机的充电线。',
      firstFrame: '俯拍图书馆桌面：低电量手机在左，打开的背包在右，一只手正伸进包里。',
      props: '兼容 USB-C 手机、Nano A1653、需要外接线的普通充电宝、背包、书本。固定俯拍机位与插头近景各一组。',
      evidence: '核对手机及手机壳兼容性。充电标识实拍；低电量仅为剧情设定，不制作电量快速上涨的假演示。对比仅涉及额外连接线。',
      coreBenefit: '内置可折叠 USB-C 插头，直接连接兼容手机。',
      hook: 'Packed the power bank. Forgot the cable.',
      body: 'Packed a power bank, forgot the cable? The Anker Nano has a fold-out USB-C connector for compatible phones. One less cable to remember.',
      cta: 'Check your phone’s compatibility.', rationale,
      script: [
        {time:'0–2s',title:'先给出需求',visual:'固定俯拍：手机亮起低电量提示；右手立刻伸向背包。书本只露出一角，避免抢走注意力。',subtitle:'Packed the power bank.',voiceover:'',sound:'室内环境声，背包拉链声。'},
        {time:'2–5s',title:'制造落空',visual:'拿出普通充电宝放到手机旁。手在包中翻找两次，空手停在桌面；不连接手机。',subtitle:'Forgot the cable.',voiceover:'',sound:'保留翻包声，停手时留半秒安静。'},
        {time:'5–8s',title:'让结构回答问题',visual:'硬切 Nano 侧面特写。拇指展开 USB-C 插头，停顿让观众看清；产品外形保持真实。',subtitle:'This one folds out.',voiceover:'',sound:'保留插头展开的真实动作声。'},
        {time:'8–12s',title:'展示真实连接',visual:'将插头接入兼容手机，镜头对准屏幕出现的充电标识；另一只手托住手机与充电宝。',subtitle:'Plug in. Keep going.',voiceover:'',sound:'使用现场录音，不添加暗示高速充电的音效。'},
        {time:'12–15s',title:'留一个明确行动',visual:'定格连接状态，画面右侧留白放商品名与兼容性提示。',subtitle:'Anker Nano · Check compatibility.',voiceover:'',sound:'轻音乐收尾。'},
      ],
    },
    {
      id: 'anker-ride', direction: '车快到了', subtitle: '把低电量放进具体的紧张时刻',
      concept: '车还有两分钟到，手机却快没电了。从一个未完成的出行安排切入，产品在等待间隙出现。',
      buyingReason: '外出还需要查看车辆信息和联系朋友时，有一份随身备用电源。',
      firstFrame: '图书馆出口，手机占画面大半：模拟叫车页写着 Driver arriving in 2 min，顶部出现低电量提示。',
      props: '兼容手机、Nano、背包、图书馆出口或普通门厅；预先制作无真实个人信息的模拟叫车画面。',
      evidence: '两分钟是剧情中的等车时间，不是充电速度。手机连接和充电标识应实拍；站在安全区域，同时托住手机与充电宝。',
      coreBenefit: '约 100g 的备用电源，可通过折叠式 USB-C 插头连接兼容手机。',
      hook: 'Your ride’s almost here. Your battery’s almost gone.',
      body: 'Your ride is two minutes away. Your phone is nearly out of battery. Keep a compact USB-C backup with you, and plug in while you wait.',
      cta: 'Meet your pocket backup.', rationale,
      script: [
        {time:'0–3s',title:'两件事同时发生',visual:'手机近景展示模拟车辆倒计时与低电量；背景虚化为图书馆出口。',subtitle:'Your ride’s almost here.',voiceover:'',sound:'门厅环境声。'},
        {time:'3–5s',title:'人物做出反应',visual:'中近景：人物看手机，再望一眼门外，拉开背包小口袋。',subtitle:'Your battery’s almost gone.',voiceover:'',sound:'拉链声作为切镜点。'},
        {time:'5–8s',title:'取出备用电源',visual:'口袋近景拿出 Nano，切插头侧面特写，展开 USB-C 插头。每个镜头只做一个动作。',subtitle:'A little backup.',voiceover:'',sound:'真实动作声。'},
        {time:'8–12s',title:'等待时补电',visual:'人物坐在出口附近，将 Nano 接上手机。先拍充电标识，再切回模拟车辆信息；不展示电量增长。',subtitle:'Plug in while you wait.',voiceover:'',sound:'轻音乐进入，保持节奏舒缓。'},
        {time:'12–15s',title:'回到出行情境',visual:'人物拿好背包，在安全步行区域手托手机与充电宝。最后一秒出现商品名。',subtitle:'Meet your pocket backup.',voiceover:'',sound:'脚步声与音乐淡出。'},
      ],
    },
    {
      id: 'anker-carry', direction: '出门四件事', subtitle: '用真实大小与收纳动作建立吸引力',
      concept: '手机、钥匙、卡包、备用电源。用一组有节奏的俯拍动作，让产品自然加入出门清单。',
      buyingReason: '想带备用电源，又希望随身物品简单、便于收纳。',
      firstFrame: '纯色桌面俯拍，手机、钥匙、卡包依次入画，最后一只手将 Nano 放进预留空位。',
      props: '手机、钥匙、卡包、Nano、背包。固定俯拍支架与柔和窗光；物品保持真实比例。',
      evidence: '5,000mAh 为标称容量，不等于手机实际获得电量。不用广角畸变缩小产品，不承诺适合所有口袋；检查手机壳厚度与接口。',
      coreBenefit: '5,000mAh，折叠式 USB-C 插头，约 100g（3.5 oz）。',
      hook: 'Phone. Keys. Wallet. Backup.',
      body: 'A fold-out connector. A compact backup. The 5,000mAh Anker Nano fits into your everyday carry. Check your phone and case compatibility before choosing.',
      cta: 'See how it fits your everyday carry.', rationale,
      script: [
        {time:'0–3s',title:'建立出门清单',visual:'俯拍：按节奏依次放下手机、钥匙、卡包、Nano，四件物品保持真实比例。',subtitle:'Phone. Keys. Wallet. Backup.',voiceover:'',sound:'四次物品轻放桌面的声音。'},
        {time:'3–6s',title:'看清折叠结构',visual:'侧面近景展开插头，停顿半秒。手不遮住连接处，背景保持干净。',subtitle:'Fold-out USB-C.',voiceover:'',sound:'真实动作声。'},
        {time:'6–9s',title:'看清使用方式',visual:'插入兼容手机，手同时托住设备，屏幕出现真实充电标识。',subtitle:'Plug straight into a compatible phone.',voiceover:'',sound:'轻音乐，不加入夸张科技音效。'},
        {time:'9–12s',title:'完成收纳',visual:'拔下、收起插头、放入背包小口袋，用连续切镜展示三个完整动作。',subtitle:'Fold. Pack. Go.',voiceover:'',sound:'拉链闭合声。'},
        {time:'12–15s',title:'规格与行动',visual:'回到桌面构图，只留 Nano，旁边留白显示容量及兼容性提示。',subtitle:'5,000mAh · Check phone and case compatibility.',voiceover:'',sound:'音乐收尾。'},
      ],
    },
  ];
}
