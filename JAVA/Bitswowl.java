import java.util.*;
public class Bitswowl{
    public static void printArry( int arr[]){
        for(int i=0; i<arr.length; i++){
            System.out.println(arr[i]);
        }
    }
    public static void sumNum( int n, int i, int sum){
        if(i ==n){
          sum *=i;
          System.out.println(sum);
            return;
        }
        sum *=i;
        sumNum(n, i+1, sum);
    //factorial hi hain bus + ki jagah * kr diya hain
    }
    public static int calcFact(int n){
        if(n ==1 || n==0){
            return 1;
        }
        int fact_nm1 = calcFact(n-1);
        int fact_n = n * fact_nm1;
        return fact_n;
    }
    public static void main(String args[]){
    int arr[] = {7, 8, 3, 1, 2}  ;
    //BUBBLE SORT
    // for(int j = 0; j<arr.length-1; j++){
    //     for(int i=0; i<arr.length-1-j; i++){
    //         if(arr[i]>arr[i+1]){
    //             int temp = arr[i];
    //            arr[i] = arr[i+1];
    //            arr[i+1]=temp;
    //         }
    //     }
    //   }
    //SELECTION SORT
    // for(int i =0; i<arr.length -1; i++)
    //     { 
    //         int smallest =i;
    //         for (int j = i+1; j<arr.length; j++){
    //          if(arr[j]<arr[smallest]){
    //             smallest=j;
    //          }
    //         }
    //         int temp = arr[smallest];
    //         arr[smallest]= arr[i];
    //         arr[i]=temp;

    //      }
    // insertion sort' //int arr[] = {7, 8, 3, 1, 2};
    // for (int i=1; i<arr.length; i++){
    //     int current = arr[i];
    //     int j = i-1;
    //     while(j>=0 && current<arr[j]){
    //       arr[j+1]=arr[j];
    //       j--;
    //     }
    //     arr[j+1]=current;
    // }
    //   printArry(arr);


    //recursion
    int n = 9;

System.out.println(calcFact(n));
    }
}