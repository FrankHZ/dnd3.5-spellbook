export type SourceCredit = {
  title: string;
  href?: string;
  people: string[];
  noteKey: "dndtools" | "imarvin";
};

export const englishSourceCredits: SourceCredit[] = [
  {
    title: "IMarvinTPA's Dungeons and Dragons Spells Live",
    href: "https://www.imarvintpa.com/",
    people: ["IMarvinTPA / Andy Bay"],
    noteKey: "imarvin",
  },
  {
    title: "D&D Tools",
    href: "https://github.com/dndtools/dndtools",
    people: [
      "dndtools/dndtools: FreezyExp, Jadaw1n, antoinealb, thomasfa18, bumblebee21, dndtools-personal",
      "dndtools.one: Angry Bird",
    ],
    noteKey: "dndtools",
  },
];

export const chmChsCredit = {
  translators:
    "菈比=梦=十六夜、sleepinglord、donkey、sadismma、glenrice2002、sadismma、封言枫雨、Anacius、远古之风、aland、Eden、Dya、可爱的胖胖、Cirdan、性感子弹、花盆君、liberator、灰色幽灵、WH_PAL、ETERNAL ANNAL、鹤影·仙居、SP好人不坏、小米、索拉利斯、藤井紫、geniesolmyr、Sigel、艾思哲、arakein、末日守卫，slaadslime，钛豌豆，一心求死，小剣猫，绿萝，元虚子|ymjk1803，XE学徒，追寻者端木，神怪主魔法师，其实，e_helluin，鹤影·仙居，Phantomatt，安潔莉卡，幸福的米分，涅薇儿·德拉诺尔，逆神猪，Fingertips，elf，zhangyan1100，靛蓝的鸢尾草, [哔——]ivere,低血糖的怪兽",
  compiler: "藤井紫",
  secondEdition: "低血糖的怪兽",
  assistance: "索拉利斯、锈血公爵、小米、小道，奥卡姆剃刀、逆神猪",
};
