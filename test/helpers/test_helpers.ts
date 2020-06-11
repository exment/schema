import { ChangeTree } from "../../src/changes/ChangeTree";

export const IS_COVERAGE = process.argv.find(arg => arg.indexOf("--recursive") !== -1);

export const logChangeTree = (tree: ChangeTree) => {
    if (tree.root.changes.size === 0) {
        return '{ empty }'
    }

    const logMap = (map: Map<any, string | number | symbol>) => {
        let result = []
        map.forEach(
            (value, key) => result.push(`Item"${key.name}".${key.x} => ${String(value)}`)
        )
        return result
    }

    const changeTrees = Array.from(tree.root.changes.values());

    return `
{
  changeTrees: [ ${changeTrees.map(t => t.ref.constructor.name)} ]
}\n`

//   indexMap: {
//     ${logMap(tree.indexMap).join(`\n    `)}
//   }
//   indexChange: {
//     ${logMap(tree.indexChange).join(`\n    `)}
//   }
}
