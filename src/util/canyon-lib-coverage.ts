interface Loc {
  start: {
    line: number
    column: number
  }
  end: {
    line: number
    column: number
  }
}

interface Summary {
  functions: any
  statements: any
  lines: any
  branches: any
}

interface FileCoverage {
  path: string
  statementMap: Loc[]
  fnMap: {
    name: string
    decl: Loc
    loc: Loc
    line: number
  }[]
  branchMap: {
    loc: Loc
    locations: Loc[]
    type: string
    line: number
  }[]
  s: number[]
  f: number[]
  b: number[][]
  _coverageSchema: string
  hash: string
}

interface Metric {
  total: number
  covered: number
  skipped: number
}
// 获取单个文件的概况
function fileCoverageSummary(fc: FileCoverage): Summary {
  // statements functions
  function computeSimpleTotals(stats: number[]): Metric {
    const ret: Metric = {
      total: stats.length,
      covered: stats.filter((v) => !!v).length,
      skipped: 0,
    };
    return ret
  }

  const summary: Summary = {
    statements: {},
    functions: {},
    lines: {},
    branches: {}
  }
  summary.statements = computeSimpleTotals(fc.s)
  summary.functions = computeSimpleTotals(fc.f)
  // lines
  const statementMap = fc.statementMap;
  const statements = fc.s;
  const lineMap = Object.create(null);
  statements.forEach((count, index) => {
    if (!statementMap[index]) {
      return;
    }
    const {line} = statementMap[index].start;
    const prevVal = lineMap[line];
    if (prevVal === undefined || prevVal < count) {
      lineMap[line] = count;
    }
  });
  summary.lines = computeSimpleTotals(Object.values(lineMap))

  // branches
  function computeBranchTotals(stats: number[][]) {
    const ret: Metric = {total: 0, covered: 0, skipped: 0};
    stats.forEach(branches => {
      ret.covered += branches.filter(hits => hits > 0).length;
      ret.total += branches.length;
    });
    return ret;
  }

  summary.branches = computeBranchTotals(fc.b)
  return summary
}

// 合并两个覆盖率
function mergeFileCoverageSummary(a: any, b: any): Summary {
  let defaultSummary: any = {
    statements: {
      total: 0,
      skipped: 0,
      covered: 0
    },
    functions: {
      total: 0,
      skipped: 0,
      covered: 0
    },
    lines: {
      total: 0,
      skipped: 0,
      covered: 0
    },
    branches: {
      total: 0,
      skipped: 0,
      covered: 0
    }
  }
  if (!a) {
    a = defaultSummary
  }
  if (!b) {
    b = defaultSummary
  }

  const mergeSummary: any = {
    statements: {},
    functions: {},
    lines: {},
    branches: {}
  }

  for (const mergeSummaryKey in mergeSummary) {
    mergeSummary[mergeSummaryKey].total = a[mergeSummaryKey].total + b[mergeSummaryKey].total
    mergeSummary[mergeSummaryKey].covered = a[mergeSummaryKey].covered + b[mergeSummaryKey].covered
    mergeSummary[mergeSummaryKey].skipped = a[mergeSummaryKey].skipped + b[mergeSummaryKey].skipped
  }
  return mergeSummary
}


function genTree(cov: any) {
  let treeDTO = [{key: '__covering__', children: []}];
  // 删除第一个/
  cov = cov.map((item: any) => ({
    ...item,
    // path: item.path.substring(1, item.path.length)
  }))

  cov.forEach((item: any) => {
    let key = item.path;
    let nodeArray = key.split('/');
    let children = treeDTO;
    // 构建根节点
    // 循环构建子节点
    for (let i = 0; i < nodeArray.length; i++) {

      // 获取全路径
      const fullPath = nodeArray.filter((_: any, index: number) => (index < Number(i) || index === Number(i))).join('/')
      const isFile = Boolean(cov.find((item: any) => item.path === fullPath))
      // 定义节点数据
      let node: any = {
        key: fullPath,
        title: nodeArray[i],
        fullPath: fullPath,
        isLeaf: isFile,
        data: isFile ? fileCoverageSummary(cov.find((item: any) => item.path === fullPath)) : {}
      };

      if (i !== nodeArray.length) {
        node.children = [];
      }

      if (children.length === 0) {
        children.push(node);
      }

      let isExist = false;
      for (let j = 0; j < children.length; j++) {

        if (children[j].key === node.key) {
          if (i !== nodeArray.length - 1 && !children[j].children) {
            children[j].children = [];
          }
          children = (i === nodeArray.length - 1 ? children : children[j].children);
          isExist = true;
          break;
        }
      }

      if (!isExist) {
        children.push(node);
        if (i !== nodeArray.length - 1 && !children[children.length - 1].children) {
          children[children.length - 1].children = [];
        }
        children = (i === nodeArray.length - 1 ? children : children[children.length - 1].children);
      }
    }
  });
  return treeDTO.filter(item=>item.key!=='__covering__')
}

function genTreeSummary(jsonx: any) {
  let json = {
    key:'root',
    title:'root',
    fullPath:'root',
    children: JSON.parse(JSON.stringify(jsonx))
  } || {
    key:'root',
    title:'root',
    fullPath:'root',
    children: []
  }

  function getLeafCountTree(json: any) {
    if (json.children.length === 0) {
      json.statistics = json.data;
      return json.data;
    } else {
      let leafCount: any = {
        statements: {
          total: 0,
          skipped: 0,
          covered: 0
        },
        functions: {
          total: 0,
          skipped: 0,
          covered: 0
        },
        lines: {
          total: 0,
          skipped: 0,
          covered: 0
        },
        branches: {
          total: 0,
          skipped: 0,
          covered: 0
        }
      }
      for (let i = 0; i < json.children.length; i++) {
        leafCount = mergeFileCoverageSummary(leafCount, getLeafCountTree(json.children[i]))
      }
      json.statistics = leafCount;
      return leafCount;
    }
  }

  getLeafCountTree(json)
  return [json]
}


export function genTreeSummaryMain(coverage:any) {
  return genTreeSummary(genTree(coverage))
}
