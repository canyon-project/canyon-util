// 格式化覆盖率数据
import libCoverage from "istanbul-lib-coverage";
// istanbul-lib-source-maps暂时没有类文件
// @ts-ignore
import libSourceMaps from "istanbul-lib-source-maps";
import {genTreeSummaryMain} from "./util/canyon-lib-coverage";

// 格式化覆盖率
function formatCoverage(coverage:any) {
  return Object.values(coverage).map((item:any) => {
    return {
      ...item,
      statementMap: Object.values(item.statementMap),
      fnMap: Object.values(item.fnMap),
      branchMap: Object.values(item.branchMap),
      s: Object.values(item.s),
      f: Object.values(item.f),
      b: Object.values(item.b),
    }
  })
}

// 格式化上报的覆盖率对象
async function formatReportObject(c:any) {
  // 去除斜杠\\
  const removeSlash = (x:any) => JSON.parse(JSON.stringify(x).replace(/\\\\/g, '/'))
  const coverage = removeSlash(await remapCoverage(c.coverage))
  const instrumentCwd = removeSlash(c.instrumentCwd)

  const reversePath = (p:string) => {
    const a = p.replace(instrumentCwd, ``)
    let b = ''
    // 从第二个字符开始
    for (let i = 1; i < a.length; i++) {
      b += a[i]
    }
    return b
  }
  const obj:any = {}
  for (const coverageKey in coverage) {
    obj[reversePath(coverageKey)] = {
      ...coverage[coverageKey],
      path: reversePath(coverageKey),
    }
  }
  return {
    coverage:formatCoverage(obj),
    instrumentCwd
  }
}
// 覆盖率回溯，在覆盖率存储之前转换
function remapCoverage(obj:any) {
  return libSourceMaps
      .createSourceMapStore()
      .transformCoverage(libCoverage.createCoverageMap(obj))
      .then((res:any) => {
        const {data} = res
        const obj:any = {}
        for (const dataKey in data) {
          const x = data[dataKey]['data']
          obj[x.path] = x
        }
        return obj
      })
}

// 合并两个相同路径的覆盖率文件
function mergeFileCoverage(first:any, second:any) {
  const ret = JSON.parse(JSON.stringify(first))
  let i
  delete ret.l
  second.s.forEach(function (_:any, index:any) {
    ret.s[index] += second.s[index]
  })
  second.f.forEach(function (_:any, index:any) {
    ret.f[index] += second.f[index]
  })
  second.b.forEach(function (_:any, index:any) {
    for (i = 0; i < ret.b[index].length; i += 1) {
      ret.b[index][i] += second.b[index][i]
    }
  })
  return ret
}

// 合并多个覆盖率”大对象“
function mergeCoverage(coverages:any) {
  return coverages.reduce((previousValue: any, currentValue: any) => {
    for (let i = 0; i < currentValue.length; i++) {
      const index = previousValue.findIndex(
          (item:any) => currentValue[i].path === item.path,
      )
      if (index !== -1) {
        previousValue[index] = mergeFileCoverage(
            previousValue[index],
            currentValue[i],
        )
      } else {
        previousValue.push(currentValue[i])
      }
    }
    return previousValue
  }, [])
}
export default {
  genTreeSummaryMain,
  formatReportObject,
  mergeFileCoverage,
  mergeCoverage
}